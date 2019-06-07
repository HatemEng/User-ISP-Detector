$(document).ready( () => {
    console.log("App Is On......");

    // Your web app's Firebase configuration
    var firebaseConfig = {
        apiKey: "AIzaSyBk7dj9rkqYVUrfcl2dVxpxkSjwx62QeFk",
        authDomain: "ips-detector.firebaseapp.com",
        databaseURL: "https://ips-detector.firebaseio.com",
        projectId: "ips-detector",
        storageBucket: "ips-detector.appspot.com",
        messagingSenderId: "887976390959",
        appId: "1:887976390959:web:db0bc6f5db431e6f"
    };
    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    checkIfEarthLink(res => {
       if (res) {
           outputResult("earthlink");
       } else {
           /* first get public ip */
           getPublicIP((ip) => {
               // display public ip in the loading screen
               document.getElementById('ip').innerHTML = '<p><strong>Your Public IP: </strong>'+ ip +'</p>';
               console.log('Your public IP is:', ip);
               /* check if the IP is already exist in database */
               checkInFirebase(ip, res => {
                   if (res) {
                       outputResult(res);
                   } else {
                       console.log('get ISP and add it to database...');
                       whatMyISP(ip, res => {
                           // split the isp name from asn
                           let org = res.org;
                           let isp = org.substr(org.indexOf(' ') + 1);
                           let asn = org.substr(0, org.indexOf(' '));
                           console.log('Your ISP is:', isp);
                           console.log('ASN:', asn);
                           ispSubNetMask(asn, res => {
                               let subnets = res.split('\n');
                               subnets.splice(0, 1);
                               let data = {asn: asn ,isp: isp, subnets: subnets};
                               writeFirebaseData(data);
                               outputResult(data);
                           });
                       })
                   }
               });

           });
       }
    });


});
// show result on the  page
outputResult = (data) => {
    if (data.isp.toLowerCase().includes('earthlink ') === true) {
        result.innerHTML = "<h1>You are on EarthLink Ltd. ISP...</h1><br><br>"
    } else {
        let isp = (data.isp != null)? data.isp : "Unknown";
        result.innerHTML = "<h1>You are on " + isp + ' ISP...</h1><br><br>';

        let btn1 = document.createElement("button");
        btn1.setAttribute("class","custom-btn");
        btn1.innerHTML = "Join EarthLink Now";
        result.appendChild(btn1);
    }
};
// get the user public ip
getPublicIP = (callback) => {
    $.ajax({
        url: "https://api.ipify.org?format=json", // get public ip
        success: res => callback(res.ip),
        error: e => callback(null)
    });
};
// request to the local network api
checkIfEarthLink = (callback) => {
    $.ajax({
        url: "https://cinemana.shabakaty.com/whatismyip",
        success: res => callback(true),
        error: e => callback(false)
    });
};
// get the isp details from the pubic ip
whatMyISP = (ip, callback) => {
    $.ajax({
        url: "https://ipinfo.io/" + ip + "/json?token=8d35f8893b0b1a",
        success: res => callback(res),
        error: e => callback(null)
    })
};
// get the isp subnet mask from asn
ispSubNetMask = (asn, callback) => {
    $.ajax({
        url: "https://api.hackertarget.com/aslookup/?q=" + asn ,
        success: res => callback(res),
        error: e => callback(null)
    })
};
// write the isp details to the firebase
writeFirebaseData = (data) => {
    let db = firebase.firestore();
    db.collection("ISPs").add({
        data
    })
        .then(function(docRef) {
            console.log("Document written with ID: ", docRef.id);
        })
        .catch(function(error) {
            console.error("Error adding document: ", error);
        });

};
// check if the isp is already in the firebase
checkInFirebase = (ip, callback) => {
    var db      = firebase.firestore();
    let find    = false;
    const publicIpArr   = ip.split('.');
    publicIpArr[0] = parseInt(publicIpArr[0]);
    publicIpArr[1] = parseInt(publicIpArr[1]);
    publicIpArr[2] = parseInt(publicIpArr[2]);
    publicIpArr[3] = parseInt(publicIpArr[3]);
    db.collection("ISPs").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const data  = (doc.data()).data;
            //console.log(data);
            data.subnets.forEach(sub => {
                ipRange(sub, (start, end) =>{
                    if (publicIpArr[0] >= start[0] &&
                        publicIpArr[1] >= start[1] &&
                        publicIpArr[2] >= start[2] &&
                        publicIpArr[3] >= start[3] &&

                        publicIpArr[0] <= end[0] &&
                        publicIpArr[1] <= end[1] &&
                        publicIpArr[2] <= end[2] &&
                        publicIpArr[3] <= end[3]) {
                        console.log('match:',data);
                        callback(data);
                        find = true;
                    }
                })
            })
        });
        if (!find) callback(null);

    });
};
// calculate the range of the ip (start, end) from subnet
ipRange = (subnet, callback) => {
    let n   = subnet.substr(subnet.indexOf('/') + 1); // split the mask
    let ip  = subnet.substr(0, subnet.indexOf('/')); // split the iop from the mask
    ip      = ip.split('.'); // get the  ip as array
    // calculate the range
    let x = 32 - n;
    let ipEnd = []; // end of the ip range
    // #1
    let add = 0;
    if (x >= 8) {
        add = 2 ** 8;
        x  -= 8;
    } else {
        add = 2** x;
        x   = 0;
    }
    ipEnd[3] = parseInt(ip[3]) + add -1;

    // #2
    if (x >= 8) {
        add = 2 ** 8;
        x  -= 8;
    } else {
        add = 2** x;
        x   = 0;
    }
    ipEnd[2] = parseInt(ip[2]) + add -1;

    // #3
    if (x >= 8) {
        add = 2 ** 8;
        x  -= 8;
    } else {
        add = 2** x;
        x   = 0;
    }
    ipEnd[1] = parseInt(ip[1]) + add -1;

    // #4
    if (x >= 8) {
        add = 2 ** 8;
        x  -= 8;
    } else {
        add = 2** x;
        x   = 0;
    }
    ipEnd[0] = parseInt(ip[0]) + add -1;


    let ipStart = ip; // start of the ip range
    ipStart[0]  = parseInt(ipStart[0]);
    ipStart[1]  = parseInt(ipStart[1]);
    ipStart[2]  = parseInt(ipStart[2]);
    ipStart[3]  = parseInt(ipStart[3]);
    callback(ipStart, ipEnd)
};



/* subnetLookup = (sub, callback) => {
    $.ajax({
        //https://api.hackertarget.com/subnetcalc/?q=
        url: "https://uploadbeta.com/api/ipcalc/?cached&s=" + sub ,
        success: res => callback(res),
        error: e => callback(null)
    })
}; */