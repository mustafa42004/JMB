import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'
import { handleGetAllData, handleGetAllFileData } from '../redux/AdminDataSlice';
import Signin from '../components/admin/feature/Auth/Signin';

const AdminModule = () => {

    const dispatch = useDispatch();
    const isProcessing = useSelector(state => state.AdminDataSlice.isDataProcessing)
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState("");

    useEffect(()=>{
        dispatch(handleGetAllData())
    }, [])

    useEffect(()=>{
        dispatch(handleGetAllFileData());
    }, [])

    useEffect(()=>{
      if(isProcessing){
        document.getElementById('show-loader').style.display = 'flex'
        document.getElementById('show-loader').style.opacity = '1'
      } else {
        document.getElementById('show-loader').style.display = 'none'
        document.getElementById('show-loader').style.opacity = '0'
      }
    }, [isProcessing])

    const handleLogin = (username, password) => {
      if (username === "admin" && password === "admin") {
        setIsAuthenticated(true);
        setError("");
      } else {
        setError("Invalid username or password. Please try again.");
      }
    };

  return (
    <>
    {isAuthenticated ? (
        <Outlet />
      ) : (
        <Signin handleLogin={handleLogin} error={error} />
      )}
  <div className="loader" id='show-loader' >
  <div className="p-4 text-center">
    <div className="custom-loader" />
    <h2 className="my-3 f-w-400">Loading..</h2>
    <p className="mb-0">
      Please wait while we get your information from the web
    </p>
  </div>
</div>
    </>
    
  )
}

export default AdminModule

