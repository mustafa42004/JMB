import Dashboard from '../../components/admin/feature/Dashboard/Dashboard'
import AddMembers from '../../components/admin/feature/Manage-Members/AddMembers'
import MembersList from '../../components/admin/feature/Manage-Members/MembersList'
import AddBank from '../../components/admin/feature/Manage-Bank/AddBank'
import BankList from '../../components/admin/feature/Manage-Bank/BankList'
import AddData from '../../components/admin/feature/Manage-Data/AddData'
import DataList from '../../components/admin/feature/Manage-Data/DataList'
import ManageDashTags from '../../components/admin/feature/Manage-Data/ManageDashTags'
import DeleteData from '../../components/admin/feature/Manage-Data/DeleteData'
import ActionList from '../../components/admin/feature/Manage-Data/ActionList'
import Location from '../../components/admin/feature/Location/Location'
import DataListContent from '../../components/admin/shared/DataListContent/DataListContent'
// import Error404 from '../../components/admin/feature/404/Error404'
// import Demo from '../../components/admin/feature/Demo'



    const rootRoutes = [
        {
            path : '',
            element : <Dashboard />
        },
        {
            path : 'add-members',
            element : <AddMembers />
        },
        {
            path : 'members-list',
            element : <MembersList />
        },
        {
            path : 'add-bank',
            element : <AddBank />
        },
        {
            path : 'bank-list',
            element : <BankList />
        },
        {
            path : 'add-data',
            element : <AddData />
        },
        {
            path : 'data/:fileName',
            element : <DataListContent props={'dashboard'} />
        },
        {
            path : 'data-list',
            element : <DataList />
        },
        {
            path : 'manage-tags',
            element : <ManageDashTags />
        },
        {
            path : 'delete-data/:route',
            element : <DeleteData />
        },
        {
            path : 'action/:action',
            element : <ActionList />
        },
        {
            path : 'members-location',
            element : <Location />
        },
    ]

   


export default rootRoutes