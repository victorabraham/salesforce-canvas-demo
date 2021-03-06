var express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    qrcode = require('qrcode-npm'),
    decode = require('salesforce-signed-request'),

    consumerSecret = process.env.CONSUMER_SECRET,

    app = express();

app.set('view engine', 'ejs');
app.use(bodyParser()); // pull information from html in POST
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.send(req.params);
});

app.post('/signedrequest', function (req, res) {

    // You could save this information in the user session if needed
    var signedRequest = decode(req.body.signed_request, consumerSecret);
    var context = signedRequest.context;
    var oauthToken = signedRequest.client.oauthToken;
    var instanceUrl = signedRequest.client.instanceUrl;

    console.log(signedRequest.client);
    console.log(context);

    if (context.environment.record && context.environment.record.Id) {

        var query = "SELECT Id, FirstName, LastName, Phone, Email FROM Contact WHERE Id = '" + context.environment.record.Id + "'";

        var contactRequest = {
            url: instanceUrl + '/services/data/v49.0/query?q=' + query,
            headers: {
                'Authorization': 'OAuth ' + oauthToken
            }
        };

        request(contactRequest, function (err, response, body) {
            var qr = qrcode.qrcode(4, 'L'),
                contact = JSON.parse(body).records[0],
                text = 'MECARD:N:' + contact.LastName + ',' + contact.FirstName + ';TEL:' + contact.Phone + ';EMAIL:' + contact.Email + ';;';
            qr.addData(text);
            qr.make();
            var imgTag = qr.createImgTag(4);
            res.render('index', { contextString: JSON.stringify(context), context: context, imgTag: imgTag });
        });
    } else {
        res.render('index', { sr: JSON.stringify(signedRequest), contextString: JSON.stringify(context), context: context, imgTag: "" });
    }


});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});