// client-side js, loaded by index.html
// run by the browser each time the page is loaded

console.log("App is starting");

// first version, list not on server
//let gList = ["pie", "frozen shrimp"];   
//display(gList);

// Get and display the current shopping list by adding nothing
getListFromServer();

let submitButton = document.getElementById("submitButton");
submitButton.addEventListener("click",sendItem);

function display(gList) {
  let newList = document.createElement("ul");
  newList.id = "gransList";
  for (let i in gList) {
    let newItem = document.createElement("li");
    newItem.textContent = gList[i].title+" - "+gList[i].category+" - "+gList[i].description;
    newList.appendChild(newItem);
  }
  let oldList = document.getElementById("gransList");
  oldList.parentNode.replaceChild(newList,oldList);
}



// Called to get the shopping list from the server
function getListFromServer() {
  let url = "shoppingList";
  
  let xhr = new XMLHttpRequest;
  xhr.open("GET",url);
  // Next, add an event listener for when the HTTP response is loaded
  xhr.addEventListener("load", function() {
      if (xhr.status == 200) {
        let responseStr = xhr.responseText;  // get the JSON string 
        let gList = JSON.parse(responseStr);  // turn it into an object
        display(gList);  // print it out as a string, nicely formatted
      } else {
        console.log(xhr.responseText);
      }
  });
  // Actually send request to server
  xhr.send();
}


// called to add an item to the list
function sendItem() {
  //let item = document.getElementById("item").value;
  //let amount = document.getElementById("amount").value;
  let title = document.getElementById("title-input").value;
  let category = document.getElementById("category-input").value;
  let description = document.getElementById("description-input").value;
  let photoURL = document.querySelector('#cardImg').src;
  let data = {"lostFound":"found","title":title,"category":category,"description":description,"photoURL":photoURL,"data":"","time":"","location":""};
  let xhr = new XMLHttpRequest();
  xhr.open("POST","/newFound");
  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.addEventListener("load", function() {
    if (xhr.status == 200) {
      console.log(xhr.responseText); // response includes rowid of new item
      getListFromServer(); // get the new list and display
      // clean out text boxes
      document.getElementById("title-input").value = null;
      document.getElementById("category-input").value = null;
      document.getElementById("description-input").value = null;
    } else {
      console.log(xhr.responseText);
    }
  });
  xhr.send(JSON.stringify(data));

}


/*  
// Version using fetch
function getListFromServer() {
  let url = "shoppingList";
  
  fetch(url)
  // fetch returns a Promise the resolves into the response object
    .then(function (response) { return response.json(); }) 
    // parse the JSON from the server; response.json also returns a Promise that 
    // resolves into the JSON content
    .then (function (gList) {
      console.log(gList);
      display(gList);
      } );
  
}
*/
  
// UPLOAD IMAGE
document.querySelector('#imgUpload').addEventListener('change', () => {
  
    // get the file with the file dialog box
    const selectedFile = document.querySelector('#imgUpload').files[0];
    // store it in a FormData object
    const formData = new FormData();
    formData.append('newImage',selectedFile, selectedFile.name);
  
    let button = document.querySelector('.btn');

    // build an HTTP request data structure
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload", true);
    xhr.onloadend = function(e) {
        // Get the server's response to the upload
        console.log(xhr.responseText);
        let newImage = document.querySelector("#cardImg");
        newImage.src = "https://lost-found-162.glitch.me/images/"+selectedFile.name;
        //newImage.src = "http://ecs162.org:3000/images/wxiwang/"+selectedFile.name;
        newImage.style.display = 'block';
        document.querySelector('.image').classList.remove('upload');
        button.textContent = 'Replace Image';
    }
  
    button.textContent = 'Uploading...';
    // actually send the request
    xhr.send(formData);
});

