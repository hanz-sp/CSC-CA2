const express = require('express');
const app = express();
const {
    resolve
} = require('path');
const bodyParser = require('body-parser');
const formidable = require('formidable');
var request = require('request')
var cors = require('cors');
app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var members = require('./model/members');


// SET Authentication 
app.use('/subscribe.html', checkAuthentication)
app.use('/createJob.html', checkAuthentication)
app.use('/profile.html', checkAuthentication)


app.use(express.static('view'));

// Get env file for keys and Ids
const dotenv = require('dotenv');
dotenv.config();

// AWS
var AWS = require('aws-sdk'),
    fs = require('fs');

// Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const algoliasearch = require('algoliasearch');

// Insert algolia keys
const client = algoliasearch('', '');
const index = client.initIndex('talents');
// Add the Firebase products that you want to use
var firebase = require("firebase/app");

// Add the Firebase products that you want to use
var idToken = null;
var userUID = null;
require("firebase/auth");
var admin = require("firebase-admin");
var firebaseClient = require('firebase');

var serviceAccount = require("./config/serviceAccount.json");
var profiles = require('./model/profiles');
const { profile } = require('console');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://csc-assignment-2-cb214.firebaseio.com"
});

var firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

firebaseClient.initializeApp(firebaseConfig);


const router = express.Router()

var server = app.listen(process.env.PORT, function () {
    var port = server.address().port;
    console.log('Web App Hosted at http://localhost:%s/talents.html', port);
});

app.get('/', (req, res) => {
    const path = resolve(process.env.STATIC_DIR + '/talents.html');
    res.sendFile(path);
});

app.get('/talents', (req, res) => {
    const path = resolve('./View/talents.html');
    res.sendFile(path);
});

app.get('/viewProfile', (req, res) => {
    const path = resolve('./View/viewProfile.html');
    res.sendFile(path);
});

app.get('/login', (req, res) => {
    const path = resolve('./View/login.html');
    res.sendFile(path);
});

app.get('/subscribe', (req, res) => {
    const path = resolve('./View/subscribe.html');
    res.sendFile(path);
});

app.get('/register', (req, res) => {
    const path = resolve('./View/register.html');
    res.sendFile(path);
});

app.get('/config', async (req, res) => {
    res.send({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});


app.post('/setUserClaims', function (req, res) {
    const customClaims = {
        paid: false
    }

    admin.auth().setCustomUserClaims(req.body.id, customClaims)
        .then(() => {
            console.log("User Claims set");
            return res.end('{"success" : "Updated Successfully", "status" : 200}');
        })
        .catch(error => {
            console.log(error);
        });
})

app.get('/verifyToken', function (req, res) {
    idToken = req.headers.authorization;
    userUID = req.headers.useruid;

    if (idToken) {
        admin.auth().verifyIdToken(idToken)
            .then(function (decodedToken) {
                console.log("decodedToken.uid" + decodedToken.uid)
                if (decodedToken.uid === userUID) {
                    req.user = userUID
                    res.end('{"success" : "Updated Successfully", "status" : 200}');
                }
            })
    } else {
        res.status(403).send('Unauthorized')
    }
})

app.post('/setUserIsPaidUser', function (req, res) {
    const customClaims = {
        paid: true
    }

    admin.auth().setCustomUserClaims(userUID, customClaims)
        .then(() => {
            console.log("User is Paid User now");
            return res.end('{"success" : "Updated Successfully", "status" : 200}');
        })
        .catch(error => {
            console.log(error);
        });
})

app.get('/checkPaidDisque', function (req, res) {
    if (userUID) {
        admin.auth().getUser(userUID)
            .then((userRecord) => {
                if (userRecord.customClaims['paid']) {
                    if (userRecord.customClaims['paid'] != false) {
                        console.log("USER CLAIMS: " + userRecord.customClaims['paid']);
                        res.send('<div id="disqus_thread"></div>')
                    }
                }
            })
            .catch(() => {
                console.log("Error checking Paid")
            })
    }
})

function checkAuthentication(req, res, next) {
    if (idToken) {
        admin.auth().verifyIdToken(idToken)
            .then(() => {
                next()
            }).catch(() => {
                console.log("IN")
                res.redirect('/login.html')
            });
    } else {
        console.log("IN 2")
        res.redirect('/login.html')
    }
}

function checkPaidUser(req, res, next) {
    if (userUID) {
        admin.auth().getUser(userUID)
            .then((userRecord) => {
                if (userRecord.customClaims['paid']) {
                    if (userRecord.customClaims['paid'] != false) {
                        console.log("USER CLAIMS: " + userRecord.customClaims['paid']);
                        next()
                    } else {
                        res.redirect('/unauthorized.html')
                    }
                } else {
                    res.redirect('/unauthorized.html')
                }
            })
            .catch(() => {
                res.redirect('/unauthorized.html')
            })
    }
}

app.get('/checkCurrentUser', function (req, res) {
    if (userUID) {
        admin.auth().getUser(userUID)
            .then(userRecord => {
                console.log(userRecord.toJSON().email)
                res.send(userRecord.toJSON().email)
            })
            .catch(() => {
                console.log("Error finding user")
                res.end();
            })
    } else {
        console.log("User is logged out");
        res.end();
    }
})

app.put('/resetToken', function (req, res) {
    idToken = null;
    userUID = null;
    res.end();
})

// ----------------------------------------------------- APIs ------------------------------------------------------------
app.get('/getAllProfiles/', function (req, res) {

    profiles.getProfiles(function (err, result) {
        if (err) {
            res.status = 500;
            res.send(null);
        } else {
            res.status(200);
            console.log(result);
            res.send(result);
        }
    });
});

/*
app.get('/getOneProfile/:id', function (req, res) {
    var id = req.params.id;
    profiles.getOneProfile(id, function (err, result) {
        if (err) {
            res.status = 500;
            res.send(null);
        } else {
            res.status(200);
            console.log(result);
            res.send(result);
        }
    });
});
*/

app.post('/createNewProfile/', checkAuthentication, function (req, res) {
    const form = formidable({
        multiples: true
    });


    form.parse(req, (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }
        var name = fields.addNameInput;
        var shortname = fields.addShortNameInput;
        var reknown = fields.addReknownInput;
        var bio = fields.addBioInput;

        const form_data = {
            'modelId': '7b7f84a0-5584-42b6-bad5-d45be981e0f7',
            'file': fs.createReadStream(files.addThumbnailInput.path),
        }

        const options = {
            url: 'https://app.nanonets.com/api/v2/ObjectDetection/Model/7b7f84a0-5584-42b6-bad5-d45be981e0f7/LabelUrls/',
            formData: form_data,
            headers: {
                'Authorization': 'Basic ' + Buffer.from('DabkDzCeeygUuprbLSEjNnUnhj3Ij4_l' + ':').toString('base64')
            }
        }
        request.post(options, function (err, httpResponse, body) {
            console.log(body);
            response = JSON.parse(body)
            var isFace = false;
            for (i = 0; i < response.result.length; i++) {
                console.log("prediction: ");
                console.log(response.result[i].prediction);
                console.log("LENGTH: " + response.result[i].prediction.length);
                if (response.result[i].prediction.length > 0) {
                    console.log("SCORE: " + response.result[i].prediction[i].score);
                    console.log("LABEL: " + response.result[i].prediction[i].label);
                    if (response.result[i].prediction[i].score > 0.5 && response.result[i].prediction[i].label == "face")
                        isFace = true;
                }
                console.log("isFace: " + isFace);
            }
            if (isFace) {
                // Read in the file, convert it to base64, store to S3
                fs.readFile(files.addThumbnailInput.path, function (err, data) {
                    if (err) {
                        throw err;
                    }

                    // Insert aws keys
                    AWS.config.update({
                        accessKeyId: '',
                        secretAccessKey: '',
                        region: ''
                    });
                    var base64data = new Buffer(data, 'binary');

                    const s3 = new AWS.S3({
                        params: 'csc-talentsphotos'
                    });

                    // Store to S3 Bucket
                    s3.putObject({
                        Bucket: '/csc-talentsphotos',
                        Key: files.addThumbnailInput.name,
                        Body: base64data,
                        ACL: 'public-read'
                    }, function (resp) {
                        console.log("https://csc-talentsphotos.s3.amazonaws.com/" + files.addThumbnailInput.name)
                        console.log('Successfully uploaded package. File: ' + files.addThumbnailInput.name);
                        var imageurl = "https://csc-talentsphotos.s3.amazonaws.com/" + files.addThumbnailInput.name;

                        // Insert new Job
                        profiles.createProfile(name, shortname, reknown, bio, imageurl, function (err, result) {
                            if (err) {
                                res.status = 500;
                                res.end(err.toString());
                                //res.send(`{"Internal Server Error"}`);

                            } else {
                                // Algolia Function 
                                index.saveObject({
                                    objectID: result.insertId,
                                    talentsImage: imageurl,
                                    talentsName: name,
                                    talentsShortName: shortname,
                                    talentsReknown: reknown,
                                    talentsBio: bio
                                }).then(({
                                    objectID
                                }) => {
                                    console.log(objectID);
                                });

                                res.status(201);
                                res.redirect('/Talents.html?response=' + encodeURIComponent('Create_Success'));
                            }
                        });
                    });

                })
            } else {
                res.status = 500;
                res.redirect('/Talents.html?response=' + encodeURIComponent('Image_Error'));
            }
        });
    });
})

app.put('/updateProfile/:id', checkAuthentication, function (req, res) {

    var id = req.params.id;
    var name = req.body.name;
    var shortname = req.body.shortname;
    var reknown = req.body.reknown;
    var bio = req.body.bio;

    // Update existing profile
    profiles.updateProfile(id, name, shortname, reknown, bio, function (err, result) {
        if (err) {
            res.status = 500;
            res.end(err);

        } else {

            // Algolia Function 
            index.partialUpdateObject({
                objectID: id,
                talentsName: name,
                talentsShortName: shortname,
                talentsReknown: reknown,
                talentsBio: bio
            }).then(({
                objectID
            }) => {
                console.log(objectID);
            });

            res.status(201);
            res.json({
                success: true,
                result: result,
                status: 'Record updated successfully!'
            });
        }
    });
});



app.delete('/deleteProfile/:id', checkAuthentication, function (req, res) {
    var id = req.params.id;

    profiles.deleteProfile(id, function (err, result) {
        if (err) {
            res.status = 500;
            res.send(null);
        } else {
            index.deleteObject(id).then(({
                objectID
            }) => {
                console.log(objectID);
            });

            res.status(200);
            console.log(result);
            res.send(result);
        }
    });
});

app.get('/getAllMembers/', checkAuthentication, function (req, res) {

    members.getMembers(function (err, result) {
        if (err) {
            res.status = 500;
            res.send(null);
        } else {
            res.status(200);
            console.log(result);
            res.send(result);
        }
    });
});

app.post('/createMember/', function (req, res) {

    console.log("REQ BODY: " + req.body);

    var email = req.body.email;
    var name = req.body.name;
    var gender = req.body.gender; // Female or Male
    var age = req.body.age;
    var citizenship = req.body.citizenship; // Singaporean
    var membershiptype = req.body.membershiptype; // Free, Registered, Paid

    members.createMember(email, name, gender, age, citizenship, membershiptype, function (err, result) {
        if (err) {
            res.status = 500;
            res.send(`{"Internal Server Error"}`);

        } else {
            res.status(201);
            res.send({
                "Member ID": result.insertId
            });
        }
    });
});

// ------------------------------------------------------------ Stripe APIs -----------------------------------------------------------

app.post('/create-customer', async (req, res) => {
    // Create a new customer object
    const customer = await stripe.customers.create({
        email: req.body.email,
    });
    res.send({
        customer
    });
});

app.post('/create-subscription', async (req, res) => {
    // Set the default payment method on the customer
    try {
        await stripe.paymentMethods.attach(req.body.paymentMethodId, {
            customer: req.body.customerId,
        });
    } catch (error) {
        return res.status('402').send({
            error: {
                message: error.message
            }
        });
    }
    try {
        await stripe.customers.update(
            req.body.customerId, {
            invoice_settings: {
                default_payment_method: req.body.paymentMethodId,
            },
        }
        );
    } catch (error) {
        return res.status('402').send({
            error: {
                message: error.message
            }
        });
    }
    // Create the subscription
    const subscription = await stripe.subscriptions.create({
        customer: req.body.customerId,
        items: [{
            price: process.env[req.body.priceId]
        }],
        expand: ['latest_invoice.payment_intent'],
    });

    res.send(subscription);
});

app.post('/retry-invoice', async (req, res) => {
    // Set the default payment method on the customer

    try {
        await stripe.paymentMethods.attach(req.body.paymentMethodId, {
            customer: req.body.customerId,
        });
        await stripe.customers.update(req.body.customerId, {
            invoice_settings: {
                default_payment_method: req.body.paymentMethodId,
            },
        });
    } catch (error) {
        // in case card_decline error
        return res
            .status('402')
            .send({
                result: {
                    error: {
                        message: error.message
                    }
                }
            });
    }

    const invoice = await stripe.invoices.retrieve(req.body.invoiceId, {
        expand: ['payment_intent'],
    });
    res.send(invoice);
});

app.post('/retrieve-upcoming-invoice', async (req, res) => {
    const subscription = await stripe.subscriptions.retrieve(
        req.body.subscriptionId
    );
    const invoice = await stripe.invoices.retrieveUpcoming({
        subscription_prorate: true,
        customer: req.body.customerId,
        subscription: req.body.subscriptionId,
        subscription_items: [{
            id: subscription.items.data[0].id,
            deleted: true,
        },
        {
            price: process.env[req.body.newPriceId],
            deleted: false,
        },
        ],
    });
    res.send(invoice);
});

app.post('/manage-billing', async (req, res) => {
    // redirect to customer billing portal hosted by Stripe
    try {
        stripe.billingPortal.sessions.create({
            customer: req.body.customerId,
            return_url: req.body.return,
        },
            function (err, session) {
                // asynchronously called
                res.send(session);
            }
        );
    } catch (error) {
        return res.status('402').send({
            error: {
                message: error.message
            }
        });
    }
});

app.post('/retrieve-customer-payment-method', async (req, res) => {
    const paymentMethod = await stripe.paymentMethods.retrieve(
        req.body.paymentMethodId
    );

    res.send(paymentMethod);
});

// Webhook handler for asynchronous events.
app.post(
    '/stripe-webhook',
    bodyParser.raw({
        type: 'application/json'
    }),
    async (req, res) => {
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                req.headers['stripe-signature'],
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.log(err);
            console.log(`⚠️  Webhook signature verification failed.`);
            console.log(
                `⚠️  Check the env file and enter the correct webhook secret.`
            );
            return res.sendStatus(400);
        }
        const dataObject = event.data.object;

        switch (event.type) {
            case 'invoice.payment_succeeded':

                break;
            case 'invoice.payment_failed':

                break;
            case 'invoice.finalized':

                break;
            case 'customer.subscription.deleted':
                if (event.request != null) {

                } else {

                }
                break;
            case 'customer.subscription.trial_will_end':

                break;
            default:
        }
        res.sendStatus(200);
    }
);