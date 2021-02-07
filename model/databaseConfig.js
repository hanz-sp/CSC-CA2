var mysql = require('mysql');


var dbConnect = {

    getConnection: function () {
        var conn = mysql.createConnection({
            host: "",
            user: "",
            password: "",
            database: ""
        });
        return conn;
    }
}

module.exports = dbConnect;