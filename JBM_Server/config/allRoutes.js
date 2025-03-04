
module.exports = (io) => {
    
    let routes = require('express').Router();
    
    routes.use("/admin/data", require('../controller/Backup')(io));
    routes.use("/admin/member", require('../controller/MemberController'));
    routes.use("/admin/manage-tags", require('../controller/ManageTagsController'));
    routes.use("/admin/bank", require('../controller/BankController'));
    routes.use("/admin/login", require('../controller/UserLoginController')(io));

    return routes
}