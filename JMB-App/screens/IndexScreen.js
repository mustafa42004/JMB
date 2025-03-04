import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons'; // Added FontAwesome5 for additional icons
import { handleGetData, handleGetUserData, handlePostLocation } from '../services/UserDataService';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import socket from '../util/Socket'
import AsyncStorage from '@react-native-async-storage/async-storage';

const IndexScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [holdVehicles, setHoldVehicles] = useState([]);
  const [releaseVehicles, setReleaseVehicles] = useState([]);
  const [inYardVehicles, setInYardVehicles] = useState([]);
  const [rawFileData, setRawFileData] = useState([]);
  const [filteredData, setFilteredData] = useState([]); // For filtered search results
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true); // Loader state
  const [location, setLocation] = useState(null);

  const navigation = useNavigation();

  useEffect(()=>{

    // Listen for follow request accepted event
socket.on('fileUploaded', ( data ) => {
  // Update the button text to "Followed"
    const {success} = data 
    success && setData() 
  
});

socket.on('logout', ( data ) => {
  // Update the button text to "Followed"
    const {success} = data 
  success && navigation.navigate('LogOut');
  
});


return () => {
    // Cleanup listeners on component unmount
    socket.off('fileUploaded');
    socket.off('logout');
};
}, [socket])

  // Fetch data when the component mounts
  async function setData() {
    setLoading(true); // Start the loader
    try {
      const data = await handleGetData();
      const files = data.map(({ data }) => data).flat();
      setRawFileData(files);
      setFilteredData(files); // Initialize filtered data with all vehicles

      const holdFileData = files?.filter(value => value.ACTION === 'Hold');
      const releaseFileData = files?.filter(value => value.ACTION === 'Release');
      const yardFileData = files?.filter(value => value.ACTION === 'In Yard');
      setHoldVehicles(holdFileData);
      setReleaseVehicles(releaseFileData);
      setInYardVehicles(yardFileData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false); // Stop the loader
    }
  }
  useEffect(() => {
    setData();
  }, []);

  async function fetchUserData() {
    try {
      const data = await handleGetUserData();
      setUserData(data);
      setLocation(data?.location?.address)
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }
  useEffect(() => {
    fetchUserData();
  }, []);

  // Filter the data based on search query
  useEffect(() => {
    if (searchQuery === '') {
      setFilteredData(rawFileData);
    } else {
      const filtered = rawFileData.filter(item => {
        const regdNum = item?.REGDNUM?.toString() || ''; // Ensure REGDNUM is a string
        return regdNum.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredData(filtered);
    }
  }, [searchQuery, rawFileData]);

  const handleItemPress = (fileData) => {
    navigation.navigate('VehicleDetails', { fileData });
  };

  const handleSearchChange = (text) => {
    if (searchQuery.length > text.length) {
      // If backspace is pressed, clear the input
      setSearchQuery('');
    } else {
      // If more than 4 digits are entered, clear the previous input and set the 5th digit as the new search query
      if (text.length > 4) {
        const updatedText = text.slice(-1); // Get the last (5th) digit only
        setSearchQuery(updatedText); // Set the 5th digit as the new input
      } else {
        setSearchQuery(text); // Otherwise, update the input normally
      }
    }
  };

  const handleLogout = async() => {
    navigation.navigate('LogOut');
  };

  const handleRefresh = () => {
    setData()
    fetchUserData()
  } 

  const renderVehicleItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.itemContainer}>
      <Text style={styles.itemText}>Vehicle no.</Text>
      <Text style={styles.vehicleNo}>{item.REGDNUM}</Text>
    </TouchableOpacity>
  );

  // Function to get user location
  const getUserLocation = async () => {
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      Alert.alert('Permission Denied', 'Location access is required to track your position.');
      return;
    }

    // Get current location
    const loc = await Location.getCurrentPositionAsync({});
    // setLocation(loc);

    // Emit the location to the server
    if (loc) {
      const location = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }
      try {
                // Send via REST API
                const response = await handlePostLocation(location)
                setLocation(response.address)
                // Or use WebSocket
                // socket.emit('updateLocation', location);
        
                // console.log("Location sent to server:", location);
            } catch (error) {
                console.error("Error sending location to server:", error);
            }
    }
  };

  // Call getUserLocation when the app loads
  useEffect(() => {
    getUserLocation();

    // Track location updates in the background
    const locationTracking = setInterval(() => {
      getUserLocation();
    }, 900000); // Update every 15min

    return () => clearInterval(locationTracking); // Clear interval on unmount
  }, []);


  return (
    <>
    <View style={styles.header}>
      <View >
        <View style={styles.flex}>
          <View style={styles.customCard}>
            {/* <Text style={styles.welcomeText}>Welcome,</Text> */}
            <Text style={styles.nameText}>{userData?.member_name || ''}</Text>
          </View>
          <View style={styles.customCard}>
            <View style={styles.locationContainer}>
              <TouchableOpacity style={styles.refreshButton} onPress={() => handleRefresh()}>
                <Ionicons
                  name="refresh-outline"
                  size={24}
                  color="white"
                  style={{
                    width: 20,
                    color: 'yellow',
                  }}
                />
                <Text style={styles.logoutText}></Text>
              </TouchableOpacity>
            </View>
            <View style={styles.locationContainer}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="white" />
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
          <View style={styles.locBox}>
            <Ionicons name="location" size={20} color="black" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
      </View>

      <View style={styles.grid}>
        <StatusCard title="In Yard" icon={'warehouse'} count={inYardVehicles?.length} color="#4CAF50" navigation={navigation} type="In Yard"/>
        <StatusCard title="Release" icon={'truck'} count={releaseVehicles?.length} color="#FF9800" navigation={navigation} type="Release"/>
        <StatusCard title="Hold" icon={'hand-paper'} count={holdVehicles?.length} color="#F44336" navigation={navigation} type="Hold"/>
      </View>
    <Text style={styles.subText}>Search vehicle by chassis or vehicle number</Text>
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={24} color="gray" />
      <TextInput
        style={styles.searchInput}
        placeholder="Search"
        value={searchQuery}
        onChangeText={handleSearchChange}
        keyboardType="numeric"
        maxLength={5}
      />
    </View>
    </View>
    {/* <ScrollView style={styles.container}> */}
    {loading ? (
      <ActivityIndicator size="large" color="#e32636" style={styles.loader} />
    ) : (
      <FlatList
        data={filteredData}
        renderItem={renderVehicleItem}
        keyExtractor={(item, index) => `${item.REGDNUM}-${index}` || index.toString()}
        numColumns={2}
        contentContainerStyle={styles.flatListContent}
      />
    )}
    {/* </ScrollView> */}
    </>

  );
};

const StatusCard = ({ title, icon, count, color, navigation, type }) => {
  const handlePress = () => {
    navigation.navigate('statusDetails', { statusType: type });
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.card}>
      <View style={styles.customCard}>
        <FontAwesome5 name={icon} size={22} color={color} style={styles.cardIcon} />
        <Text style={[styles.cardCount, { color }]}>{count}</Text>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

export default IndexScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    // paddingTop: 10,
    backgroundColor: '#e32636',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomEndRadius: 40,
    borderBottomStartRadius: 40,
    justifyContent: 'center',
  },
  welcomeText: {
    color: 'white',
    fontSize: 14,
  },
  nameText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  locBox: {
    flexDirection: 'row',
  },
  locationText: {
    color: 'yellow',
    fontSize: 14,
    marginLeft: 5,
  },
  subText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'left',
    marginBottom: 0,
    marginLeft: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    margin: 20,
    marginTop: 10,
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 10,
  },
  card: {
    width: '30%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 5,
    // margin: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cardIcon: {
    // marginBottom: 10,
    // marginRight: 10
  },
  cardCount: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 16,
    marginTop: 5,
  },
  flex: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  flatListContent: {
    paddingHorizontal: 10,
  },
  itemContainer: {
    flexBasis: '47%',
    flexGrow: 1,
    flexShrink: 1,
    margin: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  itemText: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 8,
  },
  vehicleNo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  loader: {
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6347',
    padding: 8,
    borderRadius: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#ff6347',
    // padding: 8,
    // borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
  },
  customCard: {
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  }
});
