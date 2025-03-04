import React from 'react'
import MemberDataContent from '../../shared/MemberDataContent/MemberDataContent'
import DashboardTags from '../../shared/DashboardTags/DashboardTags'
import Header from '../../shared/Header/Header'

const Location = () => {

  return (
    <>
      <Header />
      <DashboardTags />
      <MemberDataContent type={'location'} />
    </>
  )
}

export default Location