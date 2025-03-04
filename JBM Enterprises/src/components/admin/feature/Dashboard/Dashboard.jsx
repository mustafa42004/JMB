import DashboardTags from '../../shared/DashboardTags/DashboardTags'
import DataListContent from '../../shared/DataListContent/DataListContent'
import Header from '../../shared/Header/Header'

const Dashboard = () => {

  return (
    <>

    <Header />

    <DashboardTags />
    <DataListContent props={'dashboard'} />

</>

  )
}

export default Dashboard