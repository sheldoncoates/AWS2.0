function validateUser(){
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
    if(username == "admin" && password == "admin"){
        document.getElementById("invalid").style.opacity = "0";
        window.location.href='./dashboard.html';
    }else{
        document.getElementById("invalid").style.opacity = "1";
    }
}