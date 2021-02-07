var db = require('./databaseConfig');

var profilesDB = {

  createProfile: function (Name, ShortName, Reknown, Bio, ImageURL, callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {

      if (err) {
        console.log(err);
        return callback(err, null);
      } else {

        var sql = "insert into Talents.Profiles(Name, ShortName, Reknown, Bio, ImageURL) values(?,?,?,?,?)";

        dbConn.query(sql, [Name, ShortName, Reknown, Bio, ImageURL], function (err, result) {
          dbConn.end();
          if (err) {
            console.log(err)
            return callback(err, null);
          } else
            return callback(null, result);
        });
      }
    });

    dbConn.connect(function(err) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }
    
      console.log('connected as id ' + connection.threadId);
    });
  },

  getProfiles: function (callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {

      if (err) {
        console.log(err);
        return callback(err, null);
      } else {

        var sql = "select * from Talents.Profiles";
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
  },

  getOneProfile: function (id, callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {

      if (err) {
        console.log(err);
        return callback(err, null);
      } else {

        var sql = "select * from Talents.Profiles where ProfileID = ?";
        dbConn.query(sql, [id], function (err, result) {
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

  getJobsByMember: function (email, callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {

      if (err) {
        console.log(err);
        return callback(err, null);
      } else {

        var sql = "select * from csc.Job where Employer = ?";
        dbConn.query(sql, [email], function (err, result) {
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

  deleteProfile: function (id, callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {

      if (err) {
        console.log(err);
        return callback(err, null);
      } else {

        var sql = "delete from Talents.Profiles where ProfileID = ?";

        dbConn.query(sql, [id], function (err, result) {
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

  updateProfile: function (ProfileId, Name, ShortName, Reknown, Bio, callback) {
    var dbConn = db.getConnection();
    dbConn.connect(function (err) {

      if (err) {
        console.log(err);
        return callback(err, null);
      } else {

        var sql = "update Talents.Profiles set Name=?, ShortName=?, Reknown=?, Bio=? where ProfileID=?";

        dbConn.query(sql, [Name, ShortName, Reknown, Bio, ProfileId], function (err, result) {
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

module.exports = profilesDB;