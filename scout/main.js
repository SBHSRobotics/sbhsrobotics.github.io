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
    this.deleteButton = document.getElementById('delete');
    this.dataTable = document.getElementById('data');
    this.grantAccessButton = document.getElementById('grant-access');
    this.revokeAccessButton = document.getElementById('revoke-access');
    this.adminDropdown = document.getElementById('admin-dropdown');
    
    $.getJSON( "teamData.json", function(data) {
        this.dataTemplate = data;
    }.bind(this))
    .error(function () {
        window.alert("Error loading data template. Please contact database admin.");
    });
        
    this.signOutButton.addEventListener('click', this.signOut.bind(this));
    this.signInButton.addEventListener('click', this.signIn.bind(this));
    this.addButton.addEventListener('click', this.createTeam.bind(this));
    this.deleteButton.addEventListener('click', this.deleteTeam.bind(this));
    this.grantAccessButton.addEventListener('click', this.grantUserAccessPopup.bind(this));
    this.revokeAccessButton.addEventListener('click', this.revokeUserAccessPopup.bind(this));
    
    this.teamDropdown.addEventListener('change', this.displaySelectedTeam.bind(this));


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

// UI functions:

ScoutNet.prototype.createTeam = function (e) {
    e.preventDefault();
    var team = { name: window.prompt("Enter a Team Name") };
    if (team.name) {
        this.saveTeam(team);
    }
}

ScoutNet.prototype.deleteTeam = function(e) {
    e.preventDefault();
    if(this.selectedTeam && window.confirm("Are you sure you would like to delete team " + this.selectedTeam + "?")) {
        this.removeSelectedTeam();
    }
}

ScoutNet.prototype.unloadTeams = function() {
    $(this.dataTable).fadeOut();
    this.dataTable.setAttribute('hidden', true);
    
    this.teams = {};
    while(this.teamDropdown.lastChild) {
        this.teamDropdown.removeChild(this.teamDropdown.lastChild);
    }
    
    
    var op = document.createElement('option');
    op.textContent = "Select a team...";
    this.teamDropdown.appendChild(op);
}

ScoutNet.prototype.loadTeams = function () {
    if (!this.database) {
        ScoutNet.prototype.loadTeams();
        return;
    }
    this.teamsRef = this.database.ref('teams');
    this.teamsRef.off();
    
    this.unloadTeams.bind(this)();
    
    var addTeam = function (data) {
        var val = data.val();
        this.addTeam(data.key, val.name);
        if (this.selectedTeam) {
            if (this.selectedTeam == val.name) {
                this.displaySelectedTeam.bind(this)(val.name);
            }
        }
    }.bind(this);
    this.teamsRef.on('child_added', addTeam);
    this.teamsRef.on('child_changed', this.loadTeams.bind(this));
    this.teamsRef.on('child_removed', this.loadTeams.bind(this));
};

ScoutNet.prototype.addTeam = function (key, value) {
    ScoutNet.teams[value] = true;
    var op = document.createElement('option');
    op.textContent = value;
    this.teamDropdown.appendChild(op);
}

ScoutNet.prototype.grantUserAccessPopup = function() {
    var email = window.prompt("Enter user's email address:");
    
    if (!this.database) {
        console.log('nope');
        ScoutNet.prototype.grantUserAccessPopup();
        return;
    } else {
        console.log('yup');
    }
    
    var usersRef = this.database.ref('users');
    
    usersRef.orderByChild("email").equalTo(email).once('value').then(function (snapshot) {
        if(snapshot.val() != null) {
            var user = snapshot.val()[Object.keys(snapshot.val())[0]];
            console.log("Granting access to " + user.name + " :: " + user.email);
            var userRef = this.database.ref('users/'+user.uid);
            userRef.set({
                uid: user.uid,
                name: user.name,
                email: user.email,
                active: true
            }).then(function () {
                console.log("User activated successfully!");
                toastr.success("Access granted to " + user.name + "!");
            }.bind(this)).catch(function (error) {
                console.error('Error activating user', error);
                toastr.error("Error granting access to user");
            });
        } else {
            toastr.error("No user with that email address in database", "Uh oh..");
        }
    }.bind(this));
}

ScoutNet.prototype.revokeUserAccessPopup = function() {
    var email = window.prompt("Enter user's email address:");
    
    if (!this.database) {
        console.log('nope');
        ScoutNet.prototype.revokeUserAccessPopup();
        return;
    } else {
        console.log('yup');
    }
    
    var usersRef = this.database.ref('users');
    
    usersRef.orderByChild("email").equalTo(email).once('value').then(function (snapshot) {
        if(snapshot.val() != null) {
            var user = snapshot.val()[Object.keys(snapshot.val())[0]];
            console.log("Revoking access from " + user.name + " :: " + user.email);
            var userRef = this.database.ref('users/'+user.uid);
            userRef.set({
                uid: user.uid,
                name: user.name,
                email: user.email,
                active: false
            }).then(function () {
                console.log("User disabled successfully!");
                toastr.success("Access revoked from " + user.name + "!");
            }.bind(this)).catch(function (error) {
                console.error('Error disabling user', error);
                toastr.error("Error revoking access from user");
            });
        } else {
            toastr.error("No user with that email address in database", "Uh oh..");
        }
    }.bind(this));
}

// Displays a Message in the UI.
ScoutNet.prototype.displaySelectedTeam = function (teamName = undefined) {
    if (!teamName || typeof(teamName) != typeof('')) {
        console.log(teamName);
        this.selectedTeam = this.teamDropdown.options[this.teamDropdown.selectedIndex].text;
    }
    
    var table = this.dataTable;
    $(table).fadeIn();
    table.removeAttribute('hidden');
    
     while(table.childNodes[2]) {
        table.removeChild(table.lastChild);
    }
    
    var displayTeam = function(data) {
        var team = data.val();
        
        for (var prop in this.dataTemplate) {//TODO: why is this null?
            if (!team[prop]) {
//                console.log("Adding missing property " + prop + " to team " + team.name);
                team[prop] = "";
            }
        }
        
        
        var keys = Object.keys(team).sort(function (a, b) {
            if (a == 'name') {
                return -1;
            } else if (b == 'name') {
                return 1;
            }
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        
        console.log(keys);
        
        keys.forEach(function (prop) {
            if (prop != 'user' && prop != 'timestamp') {
                var row = document.createElement('tr');
                var attr = document.createElement('td');
                var value = document.createElement('td');
                var input = document.createElement('input');
                
                attr.textContent = prop.toUpperCase();
                input.value = team[prop];
                value.appendChild(input);
                
                const property = prop;
                const val = input;

                var change = function() {
                    var changes = {};
                    console.log(val.value);
                    changes[property] = val.value;
//                    changes['user'] = this.auth.currentUser;
//                    changes['timestamp'] = new Date();
                    console.log(changes);
                    this.updateSelectedTeam.bind(this)(changes);
                }
                value.addEventListener('change', change.bind(this));
                
                row.appendChild(attr);
                row.appendChild(value);
                
                attr.className = "table-cell";
                value.className = "table-cell";
                input.className = "table-input";
                
                table.appendChild(row);
            }
        }.bind(this));
    }
    
    this.teamsRef.orderByChild("name").equalTo(this.selectedTeam).on("child_added", displayTeam.bind(this));
    this.teamsRef.orderByChild("name").equalTo(this.selectedTeam).on("child_changed", displayTeam.bind(this));
};

// DB functions

// Saves a new team on the Firebase DB.
ScoutNet.prototype.saveTeam = function (team) {
    if (this.checkSignedIn()) {
        var currentUser = this.auth.currentUser;
        if (ScoutNet.teams[team.name]) {
            toastr.error("Team " + team.name + " already exists!");
            return;
        }
        this.teamsRef.push({
            user: currentUser.uid,
            name: team.name,
            timestamp: Date.now()
        }).then(function () {
//            window.alert("Team " + team.name + " created!");
            toastr.success("Team " + team.name + " created!")
        }.bind(this)).catch(function (error) {
            console.error('Error writing new team to Firebase Database', error);
            toastr.error("Error creating team");
        });
    }
};

ScoutNet.prototype.updateSelectedTeam = function (props) {
    if (this.checkSignedIn()) {
        var teamsRef = this.database.ref('teams');

        var updateTeam = function(data) {
            var teamRef = teamsRef.child(data.key);

            console.log(props);
            
            teamRef.update(props)
                .then(function () {
                    toastr.success("Changes saved");
                })
                .catch(function (err) {
                    toastr.error("Error editing team");
                });
        }

        teamsRef.orderByChild("name").equalTo(this.selectedTeam).on("child_added", updateTeam);
    }
}

ScoutNet.prototype.removeSelectedTeam = function () {
    
    var teamsRef = this.database.ref('teams');
    
    var removeTeam = function(data) {
        var teamRef = teamsRef.child(data.key);

        teamRef.remove()
            .then(function () {
                toastr.success("Team deleted.");
            })
            .catch(function (err) {
                toastr.error("Error deleting team");
            });
    }
    
    teamsRef.orderByChild("name").equalTo(this.selectedTeam).on("child_added", removeTeam);
}

//
//// Sets the URL of the given img element with the URL of the image stored in Firebase Storage.
//ScoutNet.prototype.setImageUrl = function (imageUri, imgElement) {
//    // If the image is a Firebase Storage URI we fetch the URL.
//    if (imageUri.startsWith('gs://')) {
//        imgElement.src = ScoutNet.LOADING_IMAGE_URL; // Display a loading image first.
//        this.storage.refFromURL(imageUri).getMetadata().then(function (metadata) {
//            imgElement.src = metadata.downloadURLs[0];
//        });
//    } else {
//        imgElement.src = imageUri;
//    }
//};
//
//// Saves a new message containing an image URI in Firebase.
//// This first saves the image in Firebase storage.
//ScoutNet.prototype.saveTeamImage = function (event) {
//    var file = event.target.files[0];
//
//    // Clear the selection in the file picker input.
////    this.imageForm.reset();
//
//    // Check if the file is an image.
//    if (!file.type.match('image.*')) {
//
//    }
//
//    // Check if the user is signed-in
//    if (this.checkSignedIn()) {
//
//        // We add a message with a loading icon that will get updated with the shared image.
//        
//        currentUser = this.auth.currentUser;
////        this.messagesRef.push({
////            name: currentUser.displayName,
////            imageUrl: ScoutNet.LOADING_IMAGE_URL,
////            photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
////        }).then(function (data) {
////
////            // Upload the image to Firebase Storage.
////            var uploadTask = this.storage.ref(currentUser.uid + '/' + Date.now() + '/' + file.name)
////                    .put(file, {'contentType': file.type});
////            // Listen for upload completion.
////            uploadTask.on('state_changed', null, function (error) {
////                console.error('There was an error uploading a file to Firebase Storage:', error);
////            }, function () {
////
////                // Get the file's Storage URI and update the chat message placeholder.
////                var filePath = uploadTask.snapshot.metadata.fullPath;
////                data.update({imageUrl: this.storage.ref(filePath).toString()});
////            }.bind(this));
////        }.bind(this));
//    }
//};

// Auth functions

// Signs-in
ScoutNet.prototype.signIn = function () {
    // Sign in Firebase using popup auth and Google as the identity provider.
    var provider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithPopup(provider);
};

// Signs-out
ScoutNet.prototype.signOut = function () {
    // Sign out of Firebase.
    this.auth.signOut();
};

ScoutNet.prototype.saveUser = function(user) {    
    if (!this.database) {
        console.log('nope');
        ScoutNet.prototype.saveUser(user);
        return;
    } else {
        console.log('yup');
    }
    
    var userRef = this.database.ref('users/'+user.uid);
    
    userRef.once('value').then(function (snapshot) {
        if(snapshot.val() != null) {
            // User already exists
            toastr.success("Welcome back, " + user.displayName + "!")
            console.log(snapshot.val());
            
            this.database.ref('admins/' + user.uid).once('value').then( function (snapshot) {
                if(!snapshot.val()) {
                    this.adminDropdown.style = "pointer-events: none;";
                }
            }.bind(this));
            
            if (!(snapshot.val().active)) {
                //toastr signed out setup
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
                toastr.error("You do not have permission to access the database. Contact the head scout if you believe this is an error.", "Uh oh..");
            }
        } else {
            console.log("Adding new user to database...");
            userRef.set({
                uid: user.uid,
                name: user.displayName,
                email: user.email
            }).then(function () {
                console.log("New user added successfully!");
                toastr.success("Welcome, " + user.displayName + "!");
            }.bind(this)).catch(function (error) {
                console.error('Error writing new user to Firebase Database', error);
                toastr.error("Error saving user");
            });
        }
        
    console.log('done');
    }.bind(this));
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
ScoutNet.prototype.onAuthStateChanged = function (user) {
    if (user) { // User is signed in!
        this.teams = {};
        
        this.saveUser.bind(this)(user);
        
        
        while(this.teamDropdown.firstChild) {
            this.teamDropdown.removeChild(this.teamDropdown.firstChild);
        }
        // Get profile pic and user's name from the Firebase user object.
        console.log(user);
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
        this.deleteButton.removeAttribute('disabled');
        this.teamDropdown.removeAttribute('disabled');
        
            //toastr signed in setup
            toastr.options = {
              "closeButton": true,
              "debug": false,
              "newestOnTop": false,
              "progressBar": false,
              "positionClass": "toast-bottom-center",
              "preventDuplicates": false,
              "onclick": null,
              "showDuration": "3000",
              "hideDuration": "3000",
              "timeOut": "3000",
              "extendedTimeOut": "3000",
              "showEasing": "swing",
              "hideEasing": "linear",
              "showMethod": "fadeIn",
              "hideMethod": "fadeOut"
            }
        
        toastr.clear();
    } else { // User is signed out!
        this.unloadTeams();
        
        // Hide user's profile and sign-out button.
        this.userName.setAttribute('hidden', 'true');
        this.userPic.setAttribute('hidden', 'true');
        this.signOutButton.setAttribute('hidden', 'true');
        
        this.addButton.setAttribute('disabled', true);
        this.deleteButton.setAttribute('disabled', true);
        this.teamDropdown.setAttribute('disabled', true);

        // Show sign-in button.
        this.signInButton.removeAttribute('hidden');

        //toastr signed out setup
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
        
        toastr.error('You must sign in');

    }

    
};

// Returns true if user is signed-in. Otherwise false and displays a message.
ScoutNet.prototype.checkSignedIn = function () {
    // Return true if the user is signed in Firebase
    if (this.auth.currentUser) {
        return true;
    }
    return false;
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


