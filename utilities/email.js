const nodemailer = require('nodemailer');

let sendEmail = (sender, receiver, subject, username, jwtoken) => {

    var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: sender,
        pass: process.env.BURNER_EMAIL_PASSWRD
    }
    });

    var mailOptions = {
    from: sender,
    to: receiver,
    subject: subject,
    text:  `Hi! There, You have recently visited 
            our website and entered your email.
            Please follow the given link to verify your email
            http://huskytalk.herokuapp.com/verify/${username}/${jwtoken} 
            Thanks`
    };

    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
    }
    });
}

module.exports = { 
    sendEmail
}

