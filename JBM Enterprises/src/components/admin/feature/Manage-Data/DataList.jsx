import React from 'react'
import Header from '../../shared/Header/Header'
import DataListContent from '../../shared/DataListContent/DataListContent'
import DashboardTags from '../../shared/DashboardTags/DashboardTags'

const DataList = () => {
  return (
    <>
      <Header />
      <DashboardTags />
      <DataListContent props={'dataList'} />
    </>
  )
}

export default DataList