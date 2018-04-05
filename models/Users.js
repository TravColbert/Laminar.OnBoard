const bcrypt = require('bcrypt');
// const cryptPassword = function(password) {
//   console.log("cryptPassword: " + password);
//   return new Promise(function(resolve, reject) {
//     bcrypt.genSalt(10, function(err, salt) {
//       if (err) return reject(err);
//       console.log("Encrypting " + password + " with " + salt + "...");
//       bcrypt.hash(password, salt, (err, hash) => {
//         if (err) return reject(err);
//         console.log("Got this: " + hash);
//         return resolve(hash);
//       });
//     });
//   });
// }
module.exports = function(Sequelize,app) {
  return {
    tablename:"users",
    schema:{
      "email":{
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true
        },
        lm_order:1,
        lm_label:"Email Address",
        lm_placeholder:"email address"
      },
      "firstname":{
        type: Sequelize.STRING,
        onCreate: "first name here!",
        lm_order:2,
        lm_label:"First Name",
        lm_placeholder:"first (given) name"
      },
      "lastname":{
        type: Sequelize.STRING,
        onCreate: "last name here!",
        lm_order:3,
        lm_label:"Last Name",
        lm_placeholder:"last (family) name"
      },
      "password":{
        type: Sequelize.STRING,
        allowNull: false,
        validate : {
          isPassword: function(val) {
            if(val.length<8) throw new Error('Password too short');
          }
        },
        lm_order: 4,
        lm_label:"User's Passphrase"
      }
    },
    options:{
      getterMethods: {
        fullname() {
          return this.lastname + ", " + this.firstname;
        }
      },
      hooks:{
        beforeCreate:(user) => {
          console.log("Hashing user password: " + user.password);
          return app.controllers.users.cryptPassword(user.password)
          .then(success => {
            console.log("Hash: " + success);
            user.password = success;
          })
          .catch(err => {
            if (err) console.log(err);
          });
        },
        beforeUpdate:(user) => {
          console.log("Hashing user password: " + user.password);
          return app.controllers.users.cryptPassword(user.password)
          .then(success => {
            console.log("Hash: " + success);
            user.password = success;
          })
          .catch(err => {
            if (err) console.log(err);
          });
        }
      },
      scopes:{
        administratorUsers:{
          include:[
            {
              model: app.models["roles"],
              where:{name:"administrator"}
            }
          ]
        }
      }
    },
    afterSync:function(db){
      db.count({where:{email:'admin@test.com'}}).then(function(count) {
        app.log("Found " + count + " records",6);
        if(count==0) {
          db.create({
            firstname:'Administrative',
            lastname:'User',
            email:'admin@test.com',
            password:'test123!'
          }).then((record) => {
            app.log("Inserted: " + JSON.stringify(record));
          });
        };
      });
    }
  }
}
