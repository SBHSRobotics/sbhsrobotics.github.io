/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *            http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Initializes ScoutNet.
function ScoutNet() {
    this.checkSetup();

// Shortcuts to DOM Elements.
    this.body = document.getElementById('body');
    this.appContainer = document.getElementById('app');
    this.nav = document.getElementById('nav');
    this.userPic = document.getElementById('user-pic');
    this.userName = document.getElementById('user-name');
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');
    this.teamDropdown = document.getElementById('sel');
    this.addButton = document.getElementById('add');
    this.editButton = document.getElementById('edit');
    this.snackbar = document.getElementById('snackbar');

    this.signOutButton.addEventListener('click', this.signOut.bind(this));
    this.signInButton.addEventListener('click', this.signIn.bind(this));
    this.addButton.addEventListener('click', this.createTeam.bind(this));
    
    //toastr setup
    toastr.options = {
      "closeButton": false,
      "debug": false,
      "newestOnTop": false,
      "progressBar": false,
      "positionClass": "toast-bottom-center",
      "preventDuplicates": false,
      "onclick": null,
      "showDuration": "-1",
      "hideDuration": "-1",
      "timeOut": "-1",
      "extendedTimeOut": "-1",
      "showEasing": "swing",
      "hideEasing": "linear",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut"
    }


//    this.editButton.addEventListener('keyup', buttonTogglingHandler);
//    this.messageInput.addEventListener('change', buttonTogglingHandler);
        
    // Events for image upload.
//    this.submitImageButton.addEventListener('click', function () {
//        this.mediaCapture.click();
//    }.bind(this));
//    this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

    this.initFirebase();
    
    }

ScoutNet.teams = {};

// Sets up shortcuts to Firebase features and initiate firebase auth.
ScoutNet.prototype.initFirebase = function () {
    // Shortcuts to Firebase SDK features.
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.storage = firebase.storage();
    // Initiates Firebase auth and listen to auth state changes.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
}

ScoutNet.prototype.createTeam = function (e) {
    e.preventDefault();
    var team = { name: window.prompt("Enter a Team Name") };
    if (team.name) {
        this.saveTeam(e, team);
    }
}

ScoutNet.prototype.loadTeams = function () {
    this.teamsRef = this.database.ref('teams');
    this.teamsRef.off();

    var addTeam = function (data) {
        var val = data.val();
        this.addTeam(data.key, val.name);
    }.bind(this);
    this.teamsRef.on('child_added', addTeam);
    this.teamsRef.on('child_changed', addTeam);
};

ScoutNet.prototype.addTeam = function (key, value) {
    ScoutNet.teams[value] = true;
    var op = document.createElement('option');
    op.textContent = value;
    this.teamDropdown.appendChild(op);
}

// Saves a new team on the Firebase DB.
ScoutNet.prototype.saveTeam = function (event, team) {
    if (this.checkSignedInWithMessage()) {
        var currentUser = this.auth.currentUser;
        if (ScoutNet.teams[team.name]) {
            window.alert("Team " + team.name + " already exists!");
            return;
        }
        this.teamsRef.push({
            user: currentUser.displayName,
            name: team.name,
            timestamp: Date.now()
        }).then(function () {
            window.alert("Team " + team.name + " created!");
        }.bind(this)).catch(function (error) {
            console.error('Error writing new team to Firebase Database', error);
            window.Error("Error creating team");
        });
    }
};

// Sets the URL of the given img element with the URL of the image stored in Firebase Storage.
ScoutNet.prototype.setImageUrl = function (imageUri, imgElement) {
    // If the image is a Firebase Storage URI we fetch the URL.
    if (imageUri.startsWith('gs://')) {
        imgElement.src = ScoutNet.LOADING_IMAGE_URL; // Display a loading image first.
        this.storage.refFromURL(imageUri).getMetadata().then(function (metadata) {
            imgElement.src = metadata.downloadURLs[0];
        });
    } else {
        imgElement.src = imageUri;
    }
};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
ScoutNet.prototype.saveTeamImage = function (event) {
    var file = event.target.files[0];

    // Clear the selection in the file picker input.
//    this.imageForm.reset();

    // Check if the file is an image.
    if (!file.type.match('image.*')) {
        var data = {
            message: 'You can only add images',
            timeout: 2000
        };
        this.snackbar.MaterialSnackbar.showSnackbar(data);
        return;
    }

    // Check if the user is signed-in
    if (this.checkSignedInWithMessage()) {

        // We add a message with a loading icon that will get updated with the shared image.
        
        currentUser = this.auth.currentUser;
//        this.messagesRef.push({
//            name: currentUser.displayName,
//            imageUrl: ScoutNet.LOADING_IMAGE_URL,
//            photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
//        }).then(function (data) {
//
//            // Upload the image to Firebase Storage.
//            var uploadTask = this.storage.ref(currentUser.uid + '/' + Date.now() + '/' + file.name)
//                    .put(file, {'contentType': file.type});
//            // Listen for upload completion.
//            uploadTask.on('state_changed', null, function (error) {
//                console.error('There was an error uploading a file to Firebase Storage:', error);
//            }, function () {
//
//                // Get the file's Storage URI and update the chat message placeholder.
//                var filePath = uploadTask.snapshot.metadata.fullPath;
//                data.update({imageUrl: this.storage.ref(filePath).toString()});
//            }.bind(this));
//        }.bind(this));
    }
};

// Signs-in Friendly Chat.
ScoutNet.prototype.signIn = function () {
    // Sign in Firebase using popup auth and Google as the identity provider.
    var provider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithPopup(provider);
};

// Signs-out of Friendly Chat.
ScoutNet.prototype.signOut = function () {
    // Sign out of Firebase.
    this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
ScoutNet.prototype.onAuthStateChanged = function (user) {
    if (user) { // User is signed in!
        // Get profile pic and user's name from the Firebase user object.
        var profilePicUrl = user.photoURL;
        var userName = user.displayName;

        // Set the user's profile pic and name.
        this.userPic.style.backgroundImage = 'url(' + (profilePicUrl || '/images/profile_placeholder.png') + ')';
        this.userName.textContent = userName;

        // Show user's profile and sign-out button.
        this.userName.removeAttribute('hidden');
        this.userPic.removeAttribute('hidden');
        this.signOutButton.removeAttribute('hidden');

        // Hide sign-in button.
        this.signInButton.setAttribute('hidden', 'true');

        // Load existing teams
        this.loadTeams();
        
        // Enable
        this.addButton.removeAttribute('disabled');
        this.editButton.removeAttribute('disabled');
        this.teamDropdown.removeAttribute('disabled');
        toastr.clear();
    } else { // User is signed out!
        // Hide user's profile and sign-out button.
        this.userName.setAttribute('hidden', 'true');
        this.userPic.setAttribute('hidden', 'true');
        this.signOutButton.setAttribute('hidden', 'true');
        
        this.addButton.setAttribute('disabled', true);
        this.editButton.setAttribute('disabled', true);
        this.teamDropdown.setAttribute('disabled', true);

        // Show sign-in button.
        this.signInButton.removeAttribute('hidden');

        toastr.error('You must sign in');

    }

    
};

ScoutNet.prototype.mustSignIn = function (e) {
    alert(this.nav.children[this.signInButton]);
//    alert("You must sign in to use this app!");
}

// Returns true if user is signed-in. Otherwise false and displays a message.
ScoutNet.prototype.checkSignedInWithMessage = function () {
    // Return true if the user is signed in Firebase
    if (this.auth.currentUser) {
        return true;
    }

    // Display a message to the user using a Toast.
    var data = {
        message: 'You must sign-in first',
        timeout: 2000
    };
    this.snackbar.MaterialSnackbar.showSnackbar(data);
    return false;
};

// Resets the given MaterialTextField.
ScoutNet.resetMaterialTextfield = function (element) {
    element.value = '';
    element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Template for messages.
ScoutNet.TEAM_TEMPLATE =
        '<div class="message-container">' +
            '<div class="spacing"><div class="pic"></div></div>' +
            '<div class="message"></div>' +
            '<div class="name"></div>' +
        '</div>';

// A loading image URL.
ScoutNet.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
ScoutNet.prototype.displayTeam = function (key, name) {
//    var div = document.getElementById(key);
//    // If an element for that message does not exists yet we create it.
//    if (!div) {
//        var container = document.createElement('div');
//        container.innerHTML = FriendlyChat.MESSAGE_TEMPLATE;
//        div = container.firstChild;
//        div.setAttribute('id', key);
//        this.messageList.appendChild(div);
//    }
//    if (picUrl) {
//        div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
//    }
//    div.querySelector('.name').textContent = name;
//    var messageElement = div.querySelector('.message');
//    if (text) { // If the message is text.
//        messageElement.textContent = text;
//        // Replace all line breaks by <br>.
//        messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
//    } else if (imageUri) { // If the message is an image.
//        var image = document.createElement('img');
//        image.addEventListener('load', function () {
//            this.messageList.scrollTop = this.messageList.scrollHeight;
//        }.bind(this));
//        this.setImageUrl(imageUri, image);
//        messageElement.innerHTML = '';
//        messageElement.appendChild(image);
//    }
//    // Show the card fading-in and scroll to view the new message.
//    setTimeout(function () {div.classList.add('visible')}, 1);
//    this.messageList.scrollTop = this.messageList.scrollHeight;
//    this.messageInput.focus();
};

// Enables or disables the submit button depending on the values of the input
// fields.
ScoutNet.prototype.toggleButton = function () {
    if (this.checkSignedInWithMessage()) {
        this.editButton.removeAttribute('disabled');
    } else {
        this.editButton.setAttribute('disabled', 'true');
    }
};

// Checks that the Firebase SDK has been correctly setup and configured.
ScoutNet.prototype.checkSetup = function () {
    if (!window.firebase || !(firebase.app instanceof Function) || !window.config) {
        window.alert('You have not configured and imported the Firebase SDK. ' +
                'Make sure you go through the codelab setup instructions.');
    } else if (config.storageBucket === '') {
        window.alert('Your Firebase Storage bucket has not been enabled. Sorry about that. This is ' +
                'actually a Firebase bug that occurs rarely. ' +
                'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
                'and make sure the storageBucket attribute is not empty. ' +
                'You may also need to visit the Storage tab and paste the name of your bucket which is ' +
                'displayed there.');
    }
};

window.onload = function () {
    window.scoutNet = new ScoutNet();
//    scoutNet.onAuthStateChanged(false);
};


