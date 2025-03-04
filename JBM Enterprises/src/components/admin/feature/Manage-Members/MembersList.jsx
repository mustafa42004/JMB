import DashboardTags from "../../shared/DashboardTags/DashboardTags"
import Header from "../../shared/Header/Header"
import MemberDataContent from "../../shared/MemberDataContent/MemberDataContent"

const MembersList = () => {
  return (
    <>
      <Header />
      <DashboardTags />
      <MemberDataContent type={'member'} />
    </>
    )
}

export default MembersList