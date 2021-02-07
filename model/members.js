var db = require('./databaseConfig');

var membersDB = {

  createMember: function (email, name, gender, age, citizenship, membershiptype, callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {

      if (err) {
        console.log(err);
        return callback(err, null);
      } else {

        var sql = "insert into Talents.Member(email,name,gender,age,citizenship,membershiptype) values(?,?,?,?,?,?)";

        dbConn.query(sql, [email, name, gender, age, citizenship, membershiptype], function (err, result) {
          dbConn.end();
          if (err) {
            console.log(err)
            return callback(err, null);
          } else
            return callback(null, result);
        });
      }
    });
  },

  getMembers: function (callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {

      if (err) {
        console.log(err);
        return callback(err, null);
      } else {

        var sql = "select * from Talents.Member";
        dbConn.query(sql, [], function (err, result) {
          dbConn.end();
          if (err) {
            console.log(err)
            return callback(err, null);
          } else
            return callback(null, result);
        });
      }
    });
  }
}

module.exports = membersDB;