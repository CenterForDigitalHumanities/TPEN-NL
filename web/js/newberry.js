    var originalCanvasHeight, originalCanvasWidth, originalImageHeight, originalImageWidth = 0;
    var transcriptionCanvases = [];
    var focusItem = [null,null];
    var transcriptionFile = "";
    var transcriptionObject = {};
    var projectID = 0;
    var dragHelper = "<div id='dragHelper'></div>";
    var liveTool = "none";
    var zoomMultiplier = 2;
    var isMagnifying = false;
    var isPeeking = false;
    var toggleMove = false;
    var peekMemory = [];
    var currentFolio = 0; //The current folio number.  It runs from 1 -> infinity, remember to subtract 1 when referring to index.  
    var isFullscreen = true;
    var line = false;
    var isAddingLines = false;
    var charactersForButton = "";
    var tagsForButton = "";
    var colorList = ["rgba(153,255,0,.4)", "rgba(0,255,204,.4)", "rgba(51,0,204,.4)", "rgba(204,255,0,.4)", "rgba(0,0,0,.4)", "rgba(255,255,255,.4)", "rgba(255,0,0,.4)"];
    var colorThisTime = "rgba(255,255,255,.4)";
    var annoLists = [];
    var loggedInUser = false;
    var userIsAdmin = false;
    var adjustRatio = 0;
    var imgBottomPositionRatio = 0;
    var imgTopPositionRatio = 0;
    var navMemory = 0;
    var zoomLock = false;
    var annoBaseCheck = "http://devstore.rerum.io/v1/";
    var controlsMemory = {
        minLines : false,
        zenLine  : false,
        showLines: true,
        showLabels: true,
        grayscale:  false,
        invert   :  false,
        bright   :  false,
        contrast :  false
    };
    var typingTimer;      
    var transcriptionFolios = [];
    var localParsingChanges = [];
    var existingLocalChanges = false;
    var creatorID = -1;
    var doit = ""; //A timeout used later.
    var lineUpdateWorking = false;
    var homeLink = "";
    var lazyURL = "";
    
    //var basePath = window.location.protocol + "//" + window.location.host;
    
    /** LOCAL CRUD SUITE */

    /**
     * When the user tries to leave the parsing interfce, if there are changes not yet saved show the notice
     * @param clickedSave A boolean representing whether or not the user clicked to save button
     * @returns boolean that tells whether or not is showed it.
     */
    function showLocalChangesNotice(clickedSave){
        if(existingLocalChanges){
            unsetParsingInterface();
            if(clickedSave){
                //They actually clicked the button, they didn't click "Return to Transcribing"
                $("#localParsingChangesMsg").html("What would you like to do?");
            }
            else{
                $("#localParsingChangesMsg").html("You have changes that have not yet been saved...");
            }
            $("#saveEditsOverlay").fadeIn(750);
            $("#localParsingChangesNotice").fadeIn(750);
            return true;
        }
        else{
            return false;
        }
    }
    
    /**
     * Close all UI involved with showing the local changes unsaved notice
     */
    function closeLocalChangesNotice(quickly){
        if(quickly){
            $("#saveEditsOverlay").hide();
            $("#localParsingChangesNotice").hide();
        }
        else{
            $("#saveEditsOverlay").fadeOut(750);
            $("#localParsingChangesNotice").fadeOut(750);
        }
        
    }
    
    /**
     * Show the UI to let the user know changes are saving
     */
    function showChangesSavingNotice(quickly){
        if(quickly){
            $("#saveEditsOverlay").show();
            $("#localParsingChangesSavingNotice").show();
        }
        else{
            $("#saveEditsOverlay").fadeIn(750);
            $("#localParsingChangesSavingNotice").fadeIn(750);
        }
        
    }
    
    /**
     * Close the UI that lets the user know changes are saving
     */
    function closeChangesSavingNotice(quickly){
        if(quickly){
            $("#saveEditsOverlay").hide();
            $("#localParsingChangesSavingNotice").hide();
        }
        else{
            $("#saveEditsOverlay").fadeOut(750);
            $("#localParsingChangesSavingNotice").fadeOut(750);
        }
        
    }
    
    
    /**
     * Tell the user the result of commiting their changs to the server. 
     */
    function showCommitMessage(){
        
    }
        
    /**
     * Store parsing changes made separate from the lines available in the transcription view.
     * They are meant to stay local until commitLocalChangesToServer() is fired. 
     * @param {type} annoListWithChanges
     */
    function storeChangesLocally(annoListWithChanges){
        existingLocalChanges = true;
        $("#commitParsing").removeAttr("disabled");
        $("#prevCanvas").attr("onclick", "");
        $("#nextCanvas").attr("onclick", "");
        $("#pageJump").attr("disabled", "disabled");
        currentFolio = parseInt(currentFolio);
        localParsingChanges[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(annoListWithChanges));
        $("#parsingCover").hide();
    }
    
    /**
     * Take all the local changes made and commit them to the server.
     * This means saving new lines first to get their @id to add to their local objects in the local storage
     * Then updating each line that recieved a change from adding lines and getting their new @id for their local objects in local storage
     * Then updating the list keeping track of all the line changes and getting its new @id
     * Flag whether or not the user wants to stay in parsing or go back to the transcription view. 
     * 
     * https://medium.com/coding-design/writing-better-ajax-8ee4a7fb95f
     */
    function commitLocalChangesToServer(andLeave){
        console.log("Commit all changes to server.");
        var lines = localParsingChanges[currentFolio-1].otherContent[0].resources;
        closeLocalChangesNotice(true);
        showChangesSavingNotice(true);
        var def_arr = [];
        var del_arr = [];
        /*
         * Note that .each() is synchronous — the statement that follows the call to .each() will be executed only after the .each() call is complete. 
         * However, asynchronous operations started in the .each() iteration will of course continue on in their own way.
         * 
         * We use the $.each to build the array of deferred asynchronous operations instead of calling asynchronous operations inside the $.each
         */
        $.each(lines, function(i,line){
            var lineDef = jQuery.Deferred();
            if(line["@id"].indexOf("local/line")>-1){
                //It is a local line, save it.
                line["@id"] = ""; //So RERUM doesn't throw a 400, this is important
                def_arr.push(
                    saveNewLineToServer(line)
                    .then(function(responseData, status, jqXHR){
                        if(responseData.code < 400){
                            var newLineID = responseData["new_obj_state"]["@id"]; //jqXHR.getResponseHeader("Location")
                            del_arr.push(responseData["new_obj_state"]);
                            localParsingChanges[currentFolio-1].otherContent[0].resources[i]["@id"] = newLineID;
                        }
                        else{
                            //For some reason the response code was 200 even though RERUM said otherwise.  Consider this a fail.
                            console.warn("Detected a 200 but RERUM code was different 1"+responseData.code);
                            lineDef.reject();
                        }
                    })
                    .fail(function(responseData, status, jqXHR){
                        console.log("Save in commit failed...do not update list, break out of line loop if possible 10 "+i);
                    })
                );
            }
            else if(line["@id"].indexOf("changed/line")>-1){
                //It is a line that already exists on the server, but it has been changed
                line["@id"] = line["@id"].replace("/changed/line", "");
                def_arr.push(
                    updateOnServer(line)
                    .then(function(responseData, status, jqXHR){
                        if(responseData.code < 400){
                            var updatedLine = responseData["new_obj_state"];
                            del_arr.push(updatedLine);
                            localParsingChanges[currentFolio-1].otherContent[0].resources[i] = JSON.parse(JSON.stringify(updatedLine));
                        }
                        else{
                            //For some reason the response code was 200 even though RERUM said otherwise.  Consider this a fail.
                            console.log("Detected a 200 but RERUM code was different 2 "+responseData.code);
                            lineDef.reject();
                        }
                    })
                    .fail(function(responseData, status, jqXHR){
                        console.log("Update in commit failed 12 "+status);
                    })      
                );
            }
        });            
        /*
         * Since each() is syncronous, all actions inside of it completed before moving on, so we have a deferred array.  We pass that deferred array to $.when()
         * In the case where multiple Deferred objects are passed to jQuery.when(), the method returns the Promise from a new "master" Deferred object that tracks the aggregate state 
         * of all the Deferreds it has been passed. The method will resolve its master Deferred as soon as all the Deferreds resolve, or reject the master Deferred as soon as 
         * one of the Deferreds is rejected. If the master Deferred is resolved, the doneCallbacks for the master Deferred are executed.
         * If it is determined that all the operations resolved, then all new or changed lines are accounted for on the server and in local memory.  We can update the list.
         */
        
        
        /*
         * The natural behavior of $.when() fails us here.  See newberryTrans.html for the custom jQuery.whenAll() notes.
         * 
         * http://jsfiddle.net/InfinitiesLoop/yQsYK/51/
         * https://stackoverflow.com/questions/5518181/jquery-deferreds-when-and-the-fail-callback-arguments
         *          
         */
        $.whenAll.apply($, def_arr).then(function(responseData, status, jqXHR){
            updateOnServer(localParsingChanges[currentFolio-1].otherContent[0])
            .then(function(responseData, status, jqXHR){
                var updatedList = responseData["new_obj_state"];
                annoLists[currentFolio-1] = updatedList["@id"];
                localParsingChanges[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(updatedList));
                transcriptionFolios[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(updatedList));
                existingLocalChanges = false;
                $("#commitParsing").attr("disabled", "disabled");
                $("#prevCanvas").attr("onclick", "previousFolio();");
                $("#nextCanvas").attr("onclick", "nextFolio();");
                $("#pageJump").removeAttr("disabled");
                $("#saveEditsOverlay").hide();
                cleanupTranscriptlets(true);
                if(andLeave){
                    fullPage(false, true);
                }
                closeChangesSavingNotice(true);
                updateTranscriptionPreview();
            })
            .fail(function(responseData, status, jqXHR){
                console.log("Update list in commit failed 11 "+status);
                //Do we need to fire this here??  This means we could not update the list even though all line actions were successful.
                //We also need to make sure the list does not have any deleted lines in it.  
                undoLineChanges(del_arr);
            });
        })
        .fail(function(responseData, status, jqXHR){
            console.log("something in the deffered array failed 22");
            undoLineChanges(del_arr);
        });
    }
    
    /**
     * In the case one of the parsing change update or save calls was unsuccessful, we need to undo any successful call.
     * We also need to show the user the error UI in then() and fail() here.
     * @param obj_arr All objects returned in the body from successful save or update calls.
     * @returns a jQuery promise
     */
    function undoLineChanges(obj_arr){
        var def_arr = [];
        $.each(obj_arr, function(i,line){
            var lineDef = jQuery.Deferred();
            def_arr.push(
                undoLine(line)
                .then(function(responseData, status, jqXHR){
                })
                .fail(function(responseData, status, jqXHR){
                    console.log("Undo failed 100   "+i);
                })      
            );
        });
        var arrDef = jQuery.Deferred();
        $.when.apply($, def_arr).then(function(responseData, status, jqXHR){
            console.log("We were able to undo all line changes.");
            //FIXME we probably need to ensure the list knows not to have these deleted annotations in it.  
            closeChangesSavingNotice(true);
            $(".trexHead").show();
            $("#genericIssue").show(1000);
            arrDef.resolve(responseData,status, jqXHR);
        })
        .fail(function(responseData, status, jqXHR){
            console.warn("failed to undo all line changes.");
            closeChangesSavingNotice(true);
            $(".trexHead").show();
            $("#genericIssue").show(1000);
            arrDef.reject(responseData,status, jqXHR);
        });
        return arrDef.promise();
    }
    
    /**
     * A successful change was made to an object, resulting in the parameter passed to this object.
     * We need to undo that, so pass the resulting new object state to RERUM /delete.action (which heals the history tree).
     * @param {obj} line
     * @returns A jQuery promise
     */
    function undoLine(line){
        var url = "undoLine";
        var paramObj = {"content":JSON.stringify(line)};
        var delDef = jQuery.Deferred();
        $.ajax({
            url: url,
            type:"POST",
            contentType: "application/x-www-form-urlencoded; charset=utf-8",
            data:paramObj,
            dataType: "json",
            success: function(data, status, jqxhr){
                delDef.resolve(data, status, jqxhr);
            },
            error: function(data, status, jqxhr){
                console.warn("undo line error detected");
                delDef.reject(data, status, jqxhr);
            }
        });
        return delDef.promise();
    }
    
    /*
     * Save a newly created object to RERUM
     * @param {obj} jsonLine
     * @returns A jQuery promise
     */
    function saveNewLineToServer(jsonLine){
        var url = "saveNewTransLineServlet";
        var createdBy = document.location.host + "/" + creatorID;
        jsonLine["oa:createdBy"] = createdBy;
        var paramObj = {"content":JSON.stringify(jsonLine)};
        var saveDef = jQuery.Deferred();
        $.ajax({
            url: url,
            type:"POST",
            contentType: "application/x-www-form-urlencoded; charset=utf-8",
            data:paramObj,
            dataType: "json",
            success: function(data, status, jqxhr){
                saveDef.resolve(data, status, jqxhr);
            },
            error: function(data, status, jqxhr){
                console.warn("save line error detected");
                saveDef.reject(data, status, jqxhr);
            }
        });
        return saveDef.promise();
    }
    
    /*
     * Update an object in RERUM
     * @param {obj} jsonLine
     * @returns A jQuery promise
     */
    function updateOnServer(jsonObj){
        //We can't be certain whether it was a line or a list that was updated.  Don't handle putting the return
        //into local memory here, as it is important whether we are altering the list or just a line in the list. 
        var url = "updateAnnoList";
        var annoID = jsonObj["@id"];
        var paramObj = {"content":JSON.stringify(jsonObj)};
        if(annoID.indexOf(annoBaseCheck) === -1){
            url = "updateV0AnnoList";
        }
        var updateDef = jQuery.Deferred();
        $.ajax({
            url: url,
            type:"POST",
            contentType: "application/x-www-form-urlencoded; charset=utf-8",
            data:paramObj,
            dataType: "json",
            success: function(data, status, jqxhr){
                updateDef.resolve(data, status, jqxhr);
            },
            error: function(data, status, jqxhr){
                console.warn("update error detected 88");
                updateDef.reject(data, status, jqxhr);
            }
        });
        return updateDef.promise();
    }
    
    /*
     * The user does not want to save or leave the page.  They just want to keep parsing.
     * 
     */
    function keepParsing(){
        closeLocalChangesNotice();
    }
    
    /*
     * The user would like to want to undo all the changes they have made and keep parsing.
     * 
     */
    function discardLocalChanges(andLeave){
        //Remember that if there was no anno list for this page, an empty one was created.  Make sure this new list persists as the
        //existing empty list for this canvas now. 
        localParsingChanges[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(transcriptionFolios[currentFolio-1].otherContent[0]));
        existingLocalChanges = false;
        $("#commitParsing").attr("disabled", "disabled");
        $("#prevCanvas").attr("onclick", "previousFolio();");
        $("#nextCanvas").attr("onclick", "nextFolio();");
        $("#pageJump").removeAttr("disabled");
        if(andLeave){
            closeLocalChangesNotice(true);
            fullPage(false, false);
        }
        else{
            $(".parsing").remove();
            closeLocalChangesNotice();
            writeLines($("#imgTop img")); //uses .transcriptlets, which is OK in the local storing scenario since cleanupTranscriptlets is only called when committing to server.  
        }
    }
    
    /** END LOCAL CRUD SUITE */
    
    
    
    /**
     * Make sure all the parsing stuff is unselected.  The function that does this is toggleSelected(), but it doesn't work quite right here...
     * @returns {undefined}
     */
    function unsetParsingInterface(){
         //
        $("#ctrlColumnsInst").find(".activeParsingTool").fadeOut(800);
        $("#ctrlLinesInst").find(".activeParsingTool").fadeOut(800);
        $("#imgTop").children(".line").addClass("parsing").removeClass("line");
        $(".parsing").css("z-index", "5");
        $('.parsing').unbind();
        $(".parsing").css('cursor','default');
        $(".parsingColumn").remove();
        $("#parsingSplit .tpenButton.selected").removeClass("selected active");
        keepParsing();
        //This is from fullPage() since it is conditional whether or not you fire it.
        $(document).unbind("mousemove");
        $(document).unbind("mousedown");
        $(document).unbind("mouseup");
    }
    /* Load the interface to the first page of the manifest. */
    function firstFolio(){
        currentFolio = parseInt(currentFolio);
        var parsing = false;
        if($("#parsingDiv").is(":visible")){
            parsing = true;
        }
        if(parseInt(currentFolio) !== 1){
            $(".pageTurnCover").show();
            clearTimeout(typingTimer);
            if(parsing){
                focusItem = [null,null];
                currentFolio = 1;
                fullPage(true, false);
                rememberControls();
                //loadTranscriptionCanvas(transcriptionFolios[0], parsing, true);
            }
            else{
                focusItem = [null,null];
                currentFolio = 1;
                rememberControls();
                loadTranscriptionCanvas(transcriptionFolios[0], false, true, false);
            }

        }
    }
    
    /* Load the interface to the last page of the manifest. */
    function lastFolio(){
        currentFolio = parseInt(currentFolio);
        var lastFolio = transcriptionFolios.length;
        var parsing = false;
        if($("#parsingDiv").is(":visible")){
            parsing = true;
        }
        if(parseInt(currentFolio) !== parseInt(lastFolio)){
            $(".pageTurnCover").show();
            clearTimout(typingTimer);
            if(parsing){
                focusItem = [null,null];
                currentFolio = lastFolio;
                fullPage(true, false);
                rememberControls();
                //loadTranscriptionCanvas(transcriptionFolios[lastFolio-1], parsing, true);
            }
            else{
                focusItem = [null,null];
                currentFolio = lastFolio;
                rememberControls();
                loadTranscriptionCanvas(transcriptionFolios[lastFolio-1], false, true, false);
            }
        }
    }
    /* Load the interface to the previous page from the one you are on. */
    function previousFolio(){
        currentFolio = parseInt(currentFolio);
        var parsing = false;
        if($("#parsingDiv").is(":visible")){
            parsing = true;
        }
        if(parseInt(currentFolio) > 1){
            $(".pageTurnCover").show();
            clearTimeout(typingTimer);
            if(parsing){
                currentFolio -= 1;
                focusItem = [null, null];
                fullPage(true, false);
                rememberControls();
                //loadTranscriptionCanvas(transcriptionFolios[currentFolio-1], parsing, true);
            }
            else{
                focusItem = [null, null];
                currentFolio -= 1;
                rememberControls();
                loadTranscriptionCanvas(transcriptionFolios[currentFolio-1], false, true, false);
            }
        }
        else{
            //console.log("BUGGER");
        }
    }
    
    /* Load the interface to the next page from the one you are on. */
    function nextFolio(){
        currentFolio = parseInt(currentFolio);
        var parsing = false;
        if($("#parsingDiv").is(":visible")){
            parsing = true;
        }
        if(parseInt(currentFolio) !== transcriptionFolios.length){
            $(".pageTurnCover").show();
            clearTimeout(typingTimer);
            if(parsing){
                focusItem = [null, null];  
                currentFolio += 1;
                fullPage(true, false);
                rememberControls();
                //loadTranscriptionCanvas(transcriptionFolios[currentFolio-1], parsing, true);
            }
            else{
                focusItem = [null, null];  
                currentFolio += 1;
                rememberControls();
                loadTranscriptionCanvas(transcriptionFolios[currentFolio-1], false, true, false);
            }
            
        }
        else{
            //console.log("BOOGER");
        }
    }
    
    /*
     * Change the interface to restore the canvas controls set by the user
     * @param {type} str
     * @returns {Boolean}
     */
    function rememberControls(){
        controlsMemory = {
            minLines : $("#minimalLines").hasClass("selected"),
            zenLine  : $("#zenLine").hasClass("selected"),
            showLines: $("#showTheLines").hasClass("selected"),
            showLabels: $("#showTheLabels").hasClass("selected"),
            grayscale : $("button[which='grayscale']").hasClass("selected"),
            invert    : $("button[which='invert']").hasClass("selected"),
            bright    : $("#brightnessSlider").slider("option", "value"),
            contrast  : $("#contrastSlider").slider("option", "value")
        };
        //turn all of these off so they can be reapplied after the new draw.
        $("#minimalLines").removeClass("selected");
        $("#zenLine").removeClass("selected");
        $("#showTheLines").addClass("selected");
        $("#showTheLabels").addClass("selected");
        if($("button[which='grayscale']").hasClass("selected")){
            toggleFilter("grayscale");
        }
        if($("button[which='invert']").hasClass("selected")){
            toggleFilter("invert");
        }
    }
    
    /*
     * Change the interface to restore the canvas controls set by the user
     * @param {type} str
     * @returns {Boolean}
     */
    function rememberControlsForZen(){
        controlsMemory = {
            minLines : $("#minimalLines").hasClass("selected"),
            zenLine  : $("#zenLine").hasClass("selected"),
            showLines: $("#showTheLines").hasClass("selected"),
            showLabels: $("#showTheLabels").hasClass("selected"),
            grayscale : $("button[which='grayscale']").hasClass("selected"),
            invert    : $("button[which='invert']").hasClass("selected"),
            bright    : $("#brightnessSlider").slider("option", "value"),
            contrast  : $("#contrastSlider").slider("option", "value")
        };
    }
    
    /* Test if a given string can be parsed into a valid JSON object.
     * @param str  A string
     * @return bool
     */
    function isJSON(str) {
        var r = true;
        if(typeof str === "object"){
            r = true;
        }
        else{
            try {
                JSON.parse(str);
                r=true;
            } 
            catch (e) {
               r = false;
            }
        }
        return r;
    };
    

    function resetTranscription(){
        window.location.reload();

    }
    /* The tools for newberry are hard set in the html page, no need for this function. */
    
    
    /* Populate the split page for Text Preview.  These are the transcription lines' text. */
    function createPreviewPages(){  
       // console.log("Creating preview pages");
        $(".previewPage").remove();
        var noLines = true;
        var pageLabel = "";
        for(var i = 0; i<transcriptionFolios.length; i++){
            var currentFolioToUse = transcriptionFolios[i];
            pageLabel = currentFolioToUse.label;
            var currentOn = currentFolioToUse["@id"];
            var currentPage = "";
            if(i===0){
                currentPage = "currentPage";
            }
           var lines = [];
           if(currentFolioToUse.resources && currentFolioToUse.resources.length > 0){
               lines = currentFolioToUse.resources;
               populatePreview(JSON.parse(JSON.stringify(lines)), pageLabel, currentPage, i);    
           }
           else{
               if(currentFolioToUse.otherContent && currentFolioToUse.otherContent.length === 1){
                    lines = currentFolioToUse.otherContent[0].resources;
                    pageLabel = currentFolioToUse.label;
                    populatePreview(JSON.parse(JSON.stringify(lines)), pageLabel, currentPage, i);    
                }
                else{
                    //This is no longer a case we need to handle
                    //console.log("Gotta get annos on " + currentOn);
                    //gatherAndPopulate(currentOn, pageLabel, currentPage, i);                   
                }
           }

        }
    }
    
    /* Gather the annotations for a canvas and populate the preview interface with them. */
    function gatherAndPopulate(currentOn, pageLabel, currentPage, i){
        //console.log("get annos on "+currentOn);
        var annosURL = "getAnno";
        var properties = {"@type": "sc:AnnotationList", "on" : currentOn};
        //var properties = {"@type": "sc:AnnotationList", "on" : currentOn, "__rerum.history.next":{"$exists":true, "$size":0}};
        var paramOBJ = {"content": JSON.stringify(properties)};
         $.post(annosURL, paramOBJ, function(annoList){
            try{
                annoList = JSON.parse(annoList);
            }
            catch(e){ //dont kill it here
                  console.warn("I could not gather and populate for the preview pages.");
//                $("#transTemplateLoading p").html("Something went wrong. We could not get the annotation data FOR THE PREVIEW MODULE.  Refresh the page to try again.");
//                $('.transLoader img').attr('src',"images/missingImage.png");
//                $(".trexHead").show();
//                $("#genericIssue").show(1000);
//                return false;                
            }
             
            if(annoList.length > 0){
                checkForMaster(annoList, pageLabel, currentPage, i);
            }

         });
    }
    
    /**
     *  Check for which annotation list to use either by project ID or if its the master 
     *  
     */
    function checkForMaster(annoList, pageLabel, currentPage, j){
        var lines = [];
        var masterList = undefined;
        for(var i=0; i<annoList.length; i++){
            var thisList = annoList[i];
            if(thisList.isPartOf === "master"){
                //console.log("master");
                masterList = thisList; //The last list happens to be the master list, so set it.
            }
            if(thisList.isPartOf !== undefined && thisList.isPartOf == theProjectID){
               //console.log("isPartOf == "+theProjectID);
               if(thisList.resources !== undefined){
                   if(thisList.resources.length > 0){ //can be an empty list.
                       lines = thisList.resources;
                   }
                   populatePreview(JSON.parse(JSON.stringify(lines)), pageLabel, currentPage, j);
                   return false;
               }
            }
            else if(lines.length===0 && i===annoList.length-1){
                //console.log("must default to master");
                if(masterList !== undefined){
                    lines = masterList.resources;
                    populatePreview(JSON.parse(JSON.stringify(lines)), pageLabel, currentPage, j);
                }
                else{
                 //   console.log("No matching list by projectID and no master found for "+pageLabel);
                }                
                return false;
            }
        }
    }
    
    /**
     * Once a user changes text on a transcription line, the text in the transcription preview needs to show the change.
     * It only replaces the html of the line in the preview page, much less costly than rebuilding it.  
     * 
     */
    function updateTranscriptionPreviewLine(lineNum, newText){
        $(".previewPage[currentPage]").find($(".previewText[data-column='"+lineNum+"']")).html(newText+'<span class="previewLinebreak"></span>');
    }
    
    /**
     * Once a user changes the transcription parsing, the transcription preview for that page needs to show the change.
     * It rebuilds the entire preview page.
     * 
     */
    function updateTranscriptionPreview(){
        var order = parseInt(currentFolio) - 1;
        var currentPage = "";
        var pageLabel = transcriptionFolios[currentFolio-1].label;
        if($("div[order='"+order+"']").length){
            if($("div[order='"+order+"']")[0].hasAttribute("curentPage")){
                currentPage = "currentPage";
            } 
        }
        
        var newPreviewPage = $('<div order="'+order+'" class="previewPage" currentPage><span class="previewFolioNumber">'+pageLabel+'</span></div>');
        var lines = transcriptionFolios[currentFolio-1].otherContent[0].resources;
        if(lines.length === 0) newPreviewPage = $('<div order="'+order+'" class="previewPage"><span class="previewFolioNumber">'+pageLabel+'</span><br>No Lines</div>');
        var num = 0;
        var letterIndex = 0;
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for(var j=0; j<lines.length; j++){
            num++;
            var goodLine = true;
            var col = letters[letterIndex];
            var currentLine = lines[j].on;
            var currentLineXYWH = currentLine.slice(currentLine.indexOf("#xywh=")+6);
            currentLineXYWH = currentLineXYWH.split(",");
            var currentLineX = currentLineXYWH[0];
            var line = lines[j];
            var lineURL = line["@id"];
            var lineID = lineURL; //lineURL.slice(lineURL.indexOf("/line/")+6)
            var lineText = "";
            if(line.resource["cnt:chars"]){
                lineText = line.resource["cnt:chars"];
            }
            if(line.on.indexOf("#xywh") === -1){
                goodLine = false;
            }
            if(j>=1){
                var lastLine = lines[j-1].on;
                var lastLineXYWH = lastLine.slice(lastLine.indexOf("#xywh=")+6);
                lastLineXYWH = lastLineXYWH.split(",");
                var lastLineX = lastLineXYWH[0];
                var abs = Math.abs(parseInt(lastLineX) - parseInt(currentLineX));
                if(lastLine.indexOf("#xywh") === -1){
                    goodLine = false;
                }
                if(abs > 0 && goodLine){
                    letterIndex++;
                    num = 1;
                    col = letters[letterIndex];
                }
            }
            if(goodLine){
                var previewLine = $('<div class="previewLine">\n\
                         <span class="previewLineNumber" lineserverid="'+lineID+'" data-column="'+col+'" >\n\
                            '+col+''+num+'\n\
                          </span>\n\
                         <span class="previewText '+currentPage+'" data-column="'+col+num+'" lineserverid="'+lineID+'">'+lineText+'<span class="previewLinebreak"></span></span>\n\
                         <span class="previewNotes" contentEditable="(permitModify||isMember)" ></span>\n\
                     </div>');
                newPreviewPage.append(previewLine);
            }
            else{
                num--;
            }
        }
        $(".previewPage[order='"+order+"']").remove();
        if(parseInt(order) > 0){
            var afterOrder = parseInt(order)-1;
            $(".previewPage[order='"+afterOrder+"']").after(newPreviewPage);
        }
        else{
            $("#previewDiv").prepend(newPreviewPage);
        }
    }
    
    /* Populate the line preview interface on page load. */
    function populatePreview(lines, pageLabel, currentPage, order){
        var letterIndex = 0;
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var previewPage = $('<div order="'+order+'" class="previewPage" '+currentPage+'><span class="previewFolioNumber">'+pageLabel+'</span></div>');
        if(lines.length === 0) previewPage = $('<div order="'+order+'" class="previewPage"><span class="previewFolioNumber">'+pageLabel+'</span><br>No Lines</div>');
        lines = orderLines(lines);
        var num = 0;
        for(var j=0; j<lines.length; j++){
            num++;
            var goodLine = true;
            var col = letters[letterIndex];
            var currentLine = lines[j].on;
            var currentLineXYWH = currentLine.slice(currentLine.indexOf("#xywh=")+6);
            currentLineXYWH = currentLineXYWH.split(",");
            var currentLineX = currentLineXYWH[0];
            var line = lines[j];
            var lineURL = line["@id"];
            var lineID = lineURL; //lineURL.slice(lineURL.indexOf("/line/")+6)
            var lineText = "";
            if(line.resource["cnt:chars"]){
                lineText = line.resource["cnt:chars"];
            }
            if(line.on.indexOf("#xywh") === -1){
                goodLine = false;
            }
            if(j>=1){
                var lastLine = lines[j-1].on;
                var lastLineXYWH = lastLine.slice(lastLine.indexOf("#xywh=")+6);
                lastLineXYWH = lastLineXYWH.split(",");
                var lastLineX = lastLineXYWH[0];
                var abs = Math.abs(parseInt(lastLineX) - parseInt(currentLineX));
                if(lastLine.indexOf("#xywh") === -1){
                    goodLine = false;
                }
                if(abs > 0 && goodLine){
                    letterIndex++;
                    num = 1;
                    col = letters[letterIndex];
                }
            }
            if(goodLine){
                var previewLine = $('<div class="previewLine">\n\
                         <span class="previewLineNumber" lineserverid="'+lineID+'" data-column="'+col+'" >\n\
                            '+col+''+num+'\n\
                          </span>\n\
                         <span class="previewText '+currentPage+'" data-column="'+col+num+'">'+lineText+'<span class="previewLinebreak"></span></span>\n\
                         <span class="previewNotes" contentEditable="(permitModify||isMember)" ></span>\n\
                     </div>');
                previewPage.append(previewLine);
            }
            else{
                num--;
            }
        }
        //Not sure I need this!
        $(".previewPage[order='"+order+"']").remove();
        //Not sure I need this!
        if(parseInt(order) > 0){
            var afterOrder = parseInt(order)-1;
            $(".previewPage[order='"+afterOrder+"']").after(previewPage);
        }
        else{
            $("#previewDiv").prepend(previewPage);
        }
    }
    
    function populateSpecialCharacters(specialCharacters){
        try{
            specialCharacters = JSON.parse(specialCharacters);
        }
        catch(e){ //dont kill it here
            //$("#transTemplateLoading p").html("Something went wrong. We could not get the special characters.  Refresh the page to try again.");
            console.warn("I could not parse special chars.");
//            $('.transLoader img').attr('src',"images/missingImage.png");
//            $(".trexHead").show();
//            $("#genericIssue").show(1000);
            //return false;                
        }
        var speCharactersInOrder = new Array(specialCharacters.length);
        if(!specialCharacters || specialCharacters.length === 0 || specialCharacters[0] === "[]"){
            $("#toggleChars").hide();
        }
        var clas = "character";
        for (var char = 0; char < specialCharacters.length; char++){
            var thisChar = specialCharacters[char];
            if(char > 8){
                clas="character2";
            }
            if (thisChar == ""){ }
            else {
                var keyVal = thisChar.key;
                var position2 = parseInt(thisChar.position);
                var newCharacter = "<div class='"+clas+" lookLikeButtons' onclick='addchar(\"&#" + keyVal + "\")'>&#" + keyVal + ";</div>";
                if (position2 - 1 >= 0 && (position2 - 1) < specialCharacters.length) {
                    //speCharactersInOrder[position2 - 1] = newCharacter;
                    speCharactersInOrder[char] = newCharacter;
                }
                else{
                    speCharactersInOrder[char] = newCharacter;
                    //Something is wrong with the position value, do your best.
                }
            }
        }
        for (var char2 = 0; char2 < speCharactersInOrder.length; char2++){
            var textButton = speCharactersInOrder[char2];
            var button1 = $(textButton);
            $(".specialCharacters").append(button1);
        }
    }

    function populateXML(xmlTags){
        try{
            xmlTags = JSON.parse(xmlTags);
        }
        catch(e){ //may not need to do this here
            //$("#transTemplateLoading p").html("Something went wrong. We could not get the information about the XML tags for this project.  Refresh the page to try again.");
//            $('.transLoader img').attr('src',"images/missingImage.png");
//            $(".trexHead").show();
//            $("#genericIssue").show(1000);
                console.warn("I could not parse XML.");
            //return false;                
        }
        var tagsInOrder = [];
        if(!xmlTags || xmlTags.length === 0 || xmlTags[0] === "[]"){
            $("#toggleXML").hide();
        }
        for (var tagIndex = 0; tagIndex < xmlTags.length; tagIndex++){
            var newTagBtn = "";
            var tagName = xmlTags[tagIndex].tag;
            if(tagName && tagName!== "" && tagName !== " "){
                var fullTag = "("+tagName;
                var xmlTagObject = xmlTags[tagIndex];
                var parametersArray = xmlTagObject.parameters; //This is a string array of properties, paramater1-parameter5 out of the db.
                if(parametersArray){
                    if (parametersArray[0] != null) {
                        fullTag += " " + parametersArray[0];
                    }
                    if (parametersArray[1] != null) {
                       fullTag += " " + parametersArray[1];
                    }
                    if (parametersArray[2] != null) {
                       fullTag += " " + parametersArray[2];
                    }
                    if (parametersArray[3] != null) {
                       fullTag += " " + parametersArray[3];
                    }
                    if (parametersArray[4] != null) {
                       fullTag += " " + parametersArray[4];
                    }
                    
                }
                fullTag += ")";
                var description = xmlTagObject.description;
                if(description == undefined || description == ""){
                    description = tagName;
                }
                newTagBtn = "<div onclick=\"insertAtCursor('"+tagName+"', '', '" + fullTag + "',false);\" class='xmlTag lookLikeButtons' title='" + fullTag + "'>" + description + "</div>"; //onclick=\"insertAtCursor('" + tagName + "', '', '" + fullTag + "');\">
                var button = $(newTagBtn);
                $(".xmlTags").append(button);
            }
        }
    }
    
    /* Display a message to the user letting them know the project will take a long time to load. */
    function longLoad(){
        var newMessage = "This project is large and may take a long time to load.  A message will appear here if there is an error.  This may take up to 10 minutes.  Thank you for your patience.";
        $("#transTemplateLoading p").html(newMessage);
    }

    /*
     * Load transcription interface from the text in the text area. 
     */
    function loadTranscription(){
        //Object validation here.
            //setPaleographyLinks(); //This has to be done in the page load on the .html interfaces
            projectID = 4080;
            var userTranscription = $('#transcriptionText').val();
            if(userTranscription === "false" || userTranscription === false){
                userTranscription = "";
            }
            var pageToLoad = getURLVariable("p");
            currentFolio = 1;
//            longLoadingProject = window.setTimeout(function(){
//                longLoad();
//            }, 25000);
            $("#transTemplateLoading").show();
            if($.isNumeric(userTranscription)){ //The user can put the project ID in directly and a call will be made to newberry proper to grab it.
                projectID = userTranscription;
                theProjectID = projectID;
                updateURL("");
                var url = "getProjectTPENServlet?projectID="+projectID;
                $.ajax({
                    url: url,
                    type:"GET",
                    //dataType: "json",
                    contentType: "application/x-www-form-urlencoded; charset=utf-8",
                    success: function(activeProject){
                        var projectTools = activeProject.projectTool;
                        var count = 0;
                        var url  = ""; 
                        var currentUser = activeProject.cuser;
                        var leaders = activeProject.ls_leader;
                        tpenFolios = activeProject.ls_fs;
                        try{
                            leaders = JSON.parse(leaders);
                        }
                        catch(e){ //may not need to do this here
                            $("#transTemplateLoading p").html("Something went wrong. We could not get the information about the leader for this project.  Refresh the page to try again.");
                            $('.transLoader img').attr('src',"images/missingImage.png");
                            console.warn("I could not get leaders of the project.");
                            //clearTimeout(longLoadingProject);
                            //$(".trexHead").show();
                            //$("#genericIssue").show(1000);
                            return false;                
                        }
                        try{
                            tpenFolios = JSON.parse(tpenFolios);
                        }
                        catch(e){ //may not need to do this here
                            $("#transTemplateLoading p").html("Something went wrong. We could not get the information about the folios for this project.  Refresh the page to try again.");
                            $('.transLoader img').attr('src',"images/missingImage.png");
                            console.warn("I could not parse folios.");
                            //clearTimeout(longLoadingProject);
                            $(".theText").attr("disabled","disabled");
                            $("#parsingCover").focus();
                            $(".trexHead").show();
                            $("#genericIssue").show(1000);
                            return false;                
                        }
                        $.each(leaders, function(){
                            if(this.UID === parseInt(currentUser)){
                                //console.log("This user is a leader.");
                                userIsAdmin = true;
                                $("#parsingBtn").show();
                                $(".editButtons").show();

                            }
                        });
                        if(activeProject.manifest !== undefined && activeProject.manifest !== ""){
                            var projectData = "";
                            try{
                                projectData = JSON.parse(activeProject.manifest);
                            }
                            catch(e){
                                $("#transTemplateLoading p").html("Something went wrong. We could not parse the manifest data.  Refresh the page to try again.");
                                $('.transLoader img').attr('src',"images/missingImage.png");
                                console.warn("I could not parse project data.");
                                //clearTimeout(longLoadingProject);
                                //$(".trexHead").show();
                                //$("#genericIssue").show(1000);
                                return false;                
                            }
                                    
                            if(projectData.sequences[0] !== undefined && projectData.sequences[0].canvases !== undefined
                                && projectData.sequences[0].canvases.length > 0){
                                    transcriptionFolios = projectData.sequences[0].canvases;
                                    localParsingChanges = JSON.parse(JSON.stringify(transcriptionFolios));
                                    if(pageToLoad){
                                        $.each(tpenFolios, function(i){
                                            if(this.folioNumber === parseInt(pageToLoad)){
                                                currentFolio = i + 1;
                                                return true;
                                            }
                                        });
                                    }
                                    scrubFolios();
                                    var count = 1;
                                    $.each(transcriptionFolios, function(){
                                        $("#pageJump").append("<option folioNum='"+count+"' class='folioJump' val='"+this.label+"'>"+this.label+"</option>");
                                        $("#compareJump").append("<option class='compareJump' folioNum='"+count+"' val='"+this.label+"'>"+this.label+"</option>");
                                        count++;
                                        if(this.otherContent){
                                            if(this.otherContent.length > 0){
                                                //annoLists.push(this.otherContent[0]);
                                                annoLists.push(this.otherContent[0]["@id"]);
                                            }
                                            else{
                                                //console.log("push empty 1");
                                                //otherContent was empty (IIIF says otherContent should have URI's to AnnotationLists).  We will check the store for these lists still.
                                                annoLists.push("empty");
                                            }
                                        }
                                        else{
                                            annoLists.push("noList");
                                        }
                                    });
                                    loadTranscriptionCanvas(transcriptionFolios[currentFolio-1],false, true, false);
                                    
                                    var projectTitle = projectData.label;
                                    $("#trimTitle").html(projectTitle);
                                    $("#trimTitle").attr("title", projectTitle);

                                    $('#transcriptionTemplate').css("display", "inline-block");
                                    $('#setTranscriptionObjectArea').hide();
                                    $(".instructions").hide();
                                    $(".hideme").hide();
                                    //load Iframes after user check and project information data call    
                                    //loadIframes();
                                    //getProjectTools(projectID);
                                    createPreviewPages();
                                }
                                else{
                                    $("#transTemplateLoading p").html("Something went wrong. We could not get the sequence from the manifest.  Refresh the page to try again.");
                                    $('.transLoader img').attr('src',"images/missingImage.png");
                                    console.warn("I could not find a manifest sequence.");
                                    //clearTimeout(longLoadingProject);
                                    //$(".trexHead").show();
                                    //$("#genericIssue").show(1000);
                                    return false;               
                                }
                                //clearTimeout(longLoadingProject);
                        }
                        else{
                            //clearTimeout(longLoadingProject);
                            $("#transTemplateLoading p").html("We could not get the manfiest assosiated with this project.  Refresh the page to try again.");
                            $('.transLoader img').attr('src',"images/missingImage.png");
                            return false;
                        }
                        populateSpecialCharacters(activeProject.projectButtons);
                        populateXML(activeProject.xml);

                    },
                    error: function(jqXHR,error, errorThrown) {  
                        //clearTimeout(longLoadingProject);
                        if(jqXHR.status == 401){
                            $("#transTemplateLoading p").html("You do not have permission to view this project.  If you feel this is in error, contact the administrator.");
                            $('.transLoader img').attr('src',"images/missingImage.png");
                        }
                        else if(jqXHR.status == 404){
                            $("#transTemplateLoading p").html("We could not find a project with this ID.  If you feel this is in error, contact the administrator.");
                            $('.transLoader img').attr('src',"images/missingImage.png");
                        }
                        else{
                            $("#transTemplateLoading p").html("We could not get the the project data.  Refresh the page to try again.  Contact the admin if you continue to see this message.");
                            $('.transLoader img').attr('src',"images/missingImage.png");
                        }
                    }
                });
                }
                else if(isJSON(userTranscription)){
                    try{
                        userTranscription = JSON.parse(userTranscription);
                    }
                    catch(e){ //may not need to do this here
                        $("#transTemplateLoading p").html("Something went wrong.  The user data was not in JSON format.  Resubmit or refresh the page to try again.");
                        $('.transLoader img').attr('src',"images/missingImage.png");
                        console.warn("I could not parse user json input.");
                        //clearTimeout(longLoadingProject);
                        //$(".trexHead").show();
                        //$("#genericIssue").show(1000);
                        return false;                
                    }
                    if(userTranscription.sequences[0] !== undefined && userTranscription.sequences[0].canvases !== undefined
                        && userTranscription.sequences[0].canvases.length > 0){
                            transcriptionFolios = userTranscription.sequences[0].canvases;
                            loocalParsingChanges = JSON.parse(JSON.stringify(transcriptionFolios));
                            scrubFolios();
                            var count = 1;
                            $.each(transcriptionFolios, function(){
                               $("#pageJump").append("<option folioNum='"+count+"' class='folioJump' val='"+this.label+"'>"+this.label+"</option>");
                               $("#compareJump").append("<option class='compareJump' folioNum='"+count+"' val='"+this.label+"'>"+this.label+"</option>");
                               count++;
                                if(this.otherContent){
                                    if(this.otherContent.length > 0){
                                        //annoLists.push(this.otherContent[0]);
                                        annoLists.push(this.otherContent[0]["@id"]);
                                    }
                                    else{
                                        //console.log("push empty 2");
                                        //otherContent was empty (IIIF says otherContent should have URI's to AnnotationLists).  We will check the store for these lists still.
                                        annoLists.push("empty");
                                    }
                                }
                                else{
                                    annoLists.push("noList");
                                }
                            });
                            loadTranscriptionCanvas(transcriptionFolios[0], false, true, false);
                            var projectTitle = userTranscription.label;
                            $("#trimTitle").html(projectTitle);
                            $("#trimTitle").attr("title", projectTitle);
                            $('#transcriptionTemplate').css("display", "inline-block");
                            $('#setTranscriptionObjectArea').hide();
                            $(".instructions").hide();
                            $(".hideme").hide();
                            //load Iframes after user check and project information data call    
                            //loadIframes();
                            createPreviewPages();
                        }
                        else{
                            console.warn("transcription object could not be parsed, canvases could not be found.");
                            $("#transTemplateLoading p").html("Something went wrong.  We could not get canvas data.  Refresh the page to try again.");
                            $('.transLoader img').attr('src',"images/missingImage.png");
                            //clearTimeout(longLoadingProject);
                            //$(".trexHead").show();
                            //$("#genericIssue").show(1000);
                            return false;
                            //ERROR!  It is a valid JSON object, but it is malformed and cannot be read as a transcription object.OR
                        }
                        
                }
                else if (userTranscription.indexOf("http://") >= 0 || userTranscription.indexOf("https://") >= 0){
                    var localProject = false;
                    if(userTranscription.indexOf("/project/") > -1){
                        if(userTranscription.indexOf("t-pen.org") > -1){
                            localProject = false;
                            projectID = 0;  //This way, it will not grab the t-pen project id.  
                        }
                        else{
                            localProject = true; //Well, probably anyway.  I forsee this being an issue like with t-pen.
                            projectID = parseInt(userTranscription.substring(userTranscription.lastIndexOf('/project/')+9));
                            theProjectID = projectID;
                        }
                    }
                    else{
                        projectID = 0;
                    }
                    if(localProject){
                        //get project info first, get manifest out of it, populate
                        updateURL("");
                        var url = "getProjectTPENServlet?projectID="+projectID;
                        $.ajax({
                            url: url,
                            type:"GET",
                            //dataType: "json",
                            contentType: "application/x-www-form-urlencoded; charset=utf-8",
                            success: function(activeProject){
                                var projectTools = activeProject.projectTool;
                                var currentUser = activeProject.cuser;
                                var leaders = activeProject.ls_leader;
                                tpenFolios = activeProject.ls_fs;
                                try{
                                    leaders = JSON.parse(leaders);
                                }
                                catch(e){ //may not need to do this here
                                    $("#transTemplateLoading p").html("Something went wrong. We could not get the information about the leader for this project.  Refresh the page to try again.");
                                    $('.transLoader img').attr('src',"images/missingImage.png");
                                    console.warn("I could not parse leaders.");
                                    //clearTimeout(longLoadingProject);
                                    //$(".trexHead").show();
                                    //$("#genericIssue").show(1000);
                                    return false;                
                                }
                                try{
                                    tpenFolios = JSON.parse(tpenFolios);
                                }
                                catch(e){ //may not need to do this here
                                    $("#transTemplateLoading p").html("Something went wrong. We could not get the information about the folios for this project.  Refresh the page to try again.");
                                    $('.transLoader img').attr('src',"images/missingImage.png");
                                    console.warn("I could not parse folios.");
                                    //clearTimeout(longLoadingProject);
                                    //$(".trexHead").show();
                                    //$("#genericIssue").show(1000);
                                    return false;                
                                }
                                $.each(leaders, function(){
                                    if(this.UID === parseInt(currentUser)){
                                        //console.log("This user is a leader.");
                                        userIsAdmin = true;
                                        $("#parsingBtn").show();
                                        $(".editButtons").show();

                                    }
                                });
                                var count = 0;
                                var url  = "";
                                if(activeProject.manifest !== undefined && activeProject.manifest !== ""){
                                    var projectData = ""
                                    try{
                                    projectData = JSON.parse(activeProject.manifest);;
                                    }
                                    catch(e){ //may not need to do this here
                                        $("#transTemplateLoading p").html("Something went wrong. We could not get the manifest out of the TPEN data for this project.  Refresh the page to try again.");
                                        $('.transLoader img').attr('src',"images/missingImage.png");
                                        console.warn("I could get parse a manifest object.");
                                        //clearTimeout(longLoadingProject);
                                        //$(".trexHead").show();
                                        //$("#genericIssue").show(1000);
                                        return false;                
                                    }
                                    if(projectData.sequences[0] !== undefined && projectData.sequences[0].canvases !== undefined
                                        && projectData.sequences[0].canvases.length > 0){
                                        transcriptionFolios = projectData.sequences[0].canvases;
                                        loocalParsingChanges = JSON.parse(JSON.stringify(transcriptionFolios));
                                        if(pageToLoad){
                                            $.each(tpenFolios, function(i){
                                                if(this.folioNumber === parseInt(pageToLoad)){
                                                    currentFolio = i + 1;
                                                    return true;
                                                }
                                            });
                                        }
                                        scrubFolios();
                                        var count = 1;

                                        $.each(transcriptionFolios, function(){
                                            $("#pageJump").append("<option folioNum='"+count+"' class='folioJump' val='"+this.label+"'>"+this.label+"</option>");
                                            $("#compareJump").append("<option class='compareJump' folioNum='"+count+"' val='"+this.label+"'>"+this.label+"</option>");
                                            count++;
                                            if(this.otherContent){
                                                if(this.otherContent.length > 0){
                                                    //annoLists.push(this.otherContent[0]);
                                                    annoLists.push(this.otherContent[0]["@id"]);
                                                }
                                                else{
                                                    //console.log("push empty 3");
                                                    //otherContent was empty (IIIF says otherContent should have URI's to AnnotationLists).  We will check the store for these lists still.
                                                    annoLists.push("empty");
                                                }
                                            }
                                            else{
                                                annoLists.push("noList");
                                            }
                                        });
                                        loadTranscriptionCanvas(transcriptionFolios[currentFolio-1],false, true, false)                                        
                                        
                                        var projectTitle = projectData.label;
                                        $("#trimTitle").html(projectTitle);
                                        $("#trimTitle").attr("title", projectTitle);$('#transcriptionTemplate').css("display", "inline-block");
                                        $('#setTranscriptionObjectArea').hide();
                                        $(".instructions").hide();
                                        $(".hideme").hide(); 
                                        //getProjectTools(projectID);
                                        //load Iframes after user check and project information data call    
                                        //loadIframes();
                                        createPreviewPages();
                                    }
                                    else{
                                        //ERROR! It is a malformed transcription object.  There is no canvas sequence defined.  
                                        $("#transTemplateLoading p").html("Something went wrong.  We could not get canvas data.  Refresh the page to try again.");
                                        $('.transLoader img').attr('src',"images/missingImage.png");
                                        console.warn("Had trouble with the canvas data");
                                        //clearTimeout(longLoadingProject);
                                        //$(".trexHead").show();
                                        //$("#genericIssue").show(1000);
                                        return false;

                                    }
                                        
                                }
                                else{
                                    //clearTimeout(longLoadingProject);
                                    $("#transTemplateLoading p").html("We could not get the manfiest assosiated with this project.  Refresh the page to try again.");
                                    $('.transLoader img').attr('src',"images/missingImage.png");
                                    return false;
                                    //load Iframes after user check and project information data call    
                                    //loadIframes();
                                }
                                populateSpecialCharacters(activeProject.projectButtons);
                                populateXML(activeProject.xml);
                                $.each(projectTools, function(){
                                    if(count < 4){ //allows 5 tools.  
                                        var splitHeight = window.innerHeight + "px";
                                        var toolLabel = this.name;
                                        var toolSource = this.url;
                                        var splitTool = $('<div toolName="'+toolLabel+'" class="split iTool"><button class="fullScreenTrans">Full Screen Transcription</button></div>');
                                        var splitToolIframe = $('<iframe src="'+toolSource+'"></iframe>'); //style="height:'+splitHeight+';"
                                        var splitToolSelector = $('<option splitter="'+toolLabel+'" class="splitTool">'+toolLabel+'</option>');
                                        splitTool.append(splitToolIframe);
                                        $("#splitScreenTools").append(splitToolSelector);
                                        $(".iTool:last").after(splitTool);
                                    }
                                    count++;
                                });
                                //createPreviewPages();
                            },
                            error: function(jqXHR,error, errorThrown) {  
                                //clearTimeout(longLoadingProject);
                                if(jqXHR.status == 401){
                                    $("#transTemplateLoading p").html("You do not have permission to view this project.  If you feel this is in error, contact the administrator.");
                                    $('.transLoader img').attr('src',"images/missingImage.png");
                                }
                                else if(jqXHR.status == 404){
                                    $("#transTemplateLoading p").html("We could not find a project with this ID.  If you feel this is in error, contact the administrator.");
                                    $('.transLoader img').attr('src',"images/missingImage.png");
                                }
                                else{
                                    $("#transTemplateLoading p").html("We could not get the the project data.  Refresh the page to try again.  Contact the admin if you continue to see this message.");
                                    $('.transLoader img').attr('src',"images/missingImage.png");
                                }
                                return false;
                            }
                        });
                    }
                    else{ //it is not a local project, so just grab the url that was input and request the manifst. 
                        var url  = userTranscription;
                        $.ajax({
                            url: url,
                            type: "GET",
                            //dataType: "json",
                            contentType: "application/x-www-form-urlencoded; charset=utf-8",
                            success: function(projectData){
                                if(projectData.sequences[0] !== undefined && projectData.sequences[0].canvases !== undefined
                                && projectData.sequences[0].canvases.length > 0){
                                    transcriptionFolios = projectData.sequences[0].canvases;
                                    localParsingChanges = JSON.parse(JSON.stringify(transcriptionFolios));
                                    scrubFolios();
                                    var count = 1;

                                    $.each(transcriptionFolios, function(){
                                        $("#pageJump").append("<option folioNum='"+count+"' class='folioJump' val='"+this.label+"'>"+this.label+"</option>");
                                        $("#compareJump").append("<option class='compareJump' folioNum='"+count+"' val='"+this.label+"'>"+this.label+"</option>");
                                        count++;
                                        if(this.otherContent){
                                            if(this.otherContent.length > 0){
                                                //annoLists.push(this.otherContent[0]);
                                                annoLists.push(this.otherContent[0]["@id"]);
                                            }
                                            else{
                                                //console.log("push empty 4");
                                                //otherContent was empty (IIIF says otherContent should have URI's to AnnotationLists).  We will check the store for these lists still.
                                                annoLists.push("empty");
                                            }
                                        }
                                        else{
                                            annoLists.push("noList");
                                        }
                                    });
                                    loadTranscriptionCanvas(transcriptionFolios[0],false, true, false)
                                    var projectTitle = projectData.label;
                                    $("#trimTitle").html(projectTitle);
                                    $("#trimTitle").attr("title", projectTitle);$('#transcriptionTemplate').css("display", "inline-block");
                                    $('#setTranscriptionObjectArea').hide();
                                    $(".instructions").hide();
                                    $(".hideme").hide(); 
                                    createPreviewPages();
                                    //getProjectTools(projectID);
                                }
                                else{
                                    $("#transTemplateLoading p").html("Something went wrong.  We could not get canvas data.  Refresh the page to try again.");
                                    $('.transLoader img').attr('src',"images/missingImage.png");
                                    console.warn("Had trouble with the canvas data");
                                    //clearTimeout(longLoadingProject);
                                    return false;
                                    //ERROR! It is a malformed transcription object.  There is no canvas sequence defined.  
                                }
                                //load Iframes after user check and project information data call    
                                //loadIframes();
                                
                            },
                            error: function(jqXHR,error, errorThrown) {  
                                //clearTimeout(longLoadingProject);
                                $("#transTemplateLoading p").html("We could not load this JSON object.  Check it in a validator and try again.");
                                $('.transLoader img').attr('src',"images/missingImage.png");
                                //load Iframes after user check and project information data call    
                                //loadIframes();
                           }
                        });
                    }
                }
                else{
                    //clearTimeout(longLoadingProject);
                    $("#transTemplateLoading p").html("The input was invalid (check URL variables).  Make sure you are asking for a Manifest a proper way.  Refresh to try again.");
                    $('.transLoader img').attr('src',"images/missingImage.png");
                    return false;
                    //load Iframes after user check and project information data call.  Maybe only after valid page load parameters.  uncomment this line if necessary.    
                    //loadIframes();
                }
            
    }
    
    /*
     * Load a canvas from the manifest to the transcription interface. 
     */
    function loadTranscriptionCanvas(canvasObj, parsing, restore, returnFromParsing){
        var noLines = true;
        var canvasAnnoList = "";
        $("#imgTop, #imgBottom").css("height", "0px");
        $("#imgTop img, #imgBottom img").css("height", "0px");
        $("#imgTop img, #imgBottom img").css("width", "auto");
        $("#prevColLine").html("**");
        $("#currentColLine").html("**");
        $('.lineColIndicator').remove();
        $(".transcriptlet").remove();
        var pageTitle = canvasObj.label;
        $("#trimPage").html(pageTitle);
        $("#trimPage").attr("title", pageTitle);
        $("option[val='"+pageTitle+"']").prop("selected", true).attr("selected",true);
        $('#transcriptionTemplate').css("display", "inline-block");
        $("#parsingBtn").css("box-shadow", "none");
        $("#parsingButton").removeAttr('disabled');
        $(".lineColIndicator").css({
            "box-shadow": "rgba(255, 255, 255, 0.4)",
            "border": "1px solid rgb(255, 255, 255)"
        });
        $(".lineColOnLine").css({
            "border-left": "1px solid rgba(255, 255, 255, 0.2);",
            "color": "rgb(255, 255, 255)"
        });
        //Move up all image annos
        var cnt = -1;
        
        if(canvasObj.images[0].resource['@id'] !== undefined && canvasObj.images[0].resource['@id'] !== ""){ //Only one image
            var image = new Image();
            var origImageURL = canvasObj.images[0].resource['@id'].replace('amp;','');
            $(image)
                .on("load",function() {
                    $("#transTemplateLoading").hide();
                    $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
                    $("#imgTop img, #imgBottom img").css("width", "100%");
                    $("#imgBottom").css("height", "inherit");
                    $('.transcriptionImage').attr('src', origImageURL);
                    $("#fullPageImg").attr("src", origImageURL);
                    if(returnFromParsing){
                        //If we were in parsing and have now returned to transcribing, make sure not to overwrite the original height and width.
                    }
                    else{
                        originalImageHeight = $("#imgTop img").height(); 
                        originalImageWidth = $("#imgTop img").width();
                        originalCanvasHeight = originalImageHeight; //make sure these are set correctly
                        originalCanvasWidth = originalImageWidth;
                    }
                    drawLinesToCanvas(canvasObj, parsing, restore);
                    populateCompareSplit(currentFolio);
                    $(".previewPage[currentPage]").removeAttr("currentPage");
                    $(".previewPage[order='"+(currentFolio-1)+"']").attr("currentPage", "currentPage");
                    $("#transcriptionCanvas").attr("canvasid", canvasObj["@id"]);
                    $("#transcriptionCanvas").attr("annoList", canvasAnnoList);
                    $("#parseOptions").find(".tpenButton").removeAttr("disabled");
                    $("#parsingBtn").removeAttr("disabled");
                    lazyLoadLargerImage(origImageURL);
                    return true;
                })
                .on("error", function(){
                    var image2 = new Image();
                    $(image2)
                    .on("load", function(){
                        $("#noLineWarning").hide();
                        $("#imgTop, #imgTop img, #imgBottom img, #imgBottom, #transcriptionCanvas").css("height", "auto");
                        $("#imgTop img, #imgBottom img").css("width", "100%");
                        $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
                        $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
                        $("#imgTop").css("height", "0px");
                        $("#imgBottom img").css("top", "0px");
                        $("#imgBottom").css("height", "inherit"); 
                        $("#parsingButton").attr("disabled", "disabled");
                        //Error!  Could not load this canvas image.  Error out?
                        $("#parseOptions").find(".tpenButton").attr("disabled", "disabled");
                        $("#parsingBtn").attr("disabled", "disabled");
                        $("#transTemplateLoading p").html("Something went wrong.  We could not get canvas data.  Refresh the page to try again.");
                        $('.transLoader img').attr('src',"images/missingImage.png");
                        console.warn("Had trouble with the canvas data");
                        $("#transWorkspace").hide();
                        $(".centerInterface").hide();
                        alert("We had trouble getting the image for this canvas.  Refresh the page to try again.");
                    })
                    .attr("src", "images/missingImage.png");
                    return false;
                })
                .attr("src", origImageURL);
        }
        else{
            $('.transcriptionImage').attr('src',"images/missingImage.png");
            alert("The canvas is malformed.  No 'images' field in canvas object or images:[0]['@id'] does not exist.  Cannot draw lines.");
            $("#transTemplateLoading").hide();
            //clearTimeout(longLoadingProject);
            return false;
        }
        $(".previewText").removeClass("currentPage");
        $.each($("#previewDiv").children(".previewPage:eq("+(parseInt(currentFolio)-1)+")").find(".previewLine"),function(){
            $(this).find('.previewText').addClass("currentPage");
        });
        
    }
    
      /*
     * @paran canvasObj  A canvas object to extrac transcription lines from and draw to the interface. Handles master project designation.
     */
    function drawLinesToCanvas(canvasObj, parsing, restore){
        var lines = [];
        currentFolio = parseInt(currentFolio);
        //Clear any existing stuff.  
        $(".transcriptlet, .parsing, .line, .lineColdIndicator, .fullP").remove();
        if(canvasObj.resources !== undefined && canvasObj.resources.length > 0){
            for(var i=0; i<canvasObj.resources.length; i++){
                if(isJSON(canvasObj.resources[i])){   // it is directly an annotation
                    lines.push(canvasObj.resources[i]);
                }
            }
            linesToScreen(JSON.parse(JSON.stringify(lines)), restore, parsing);
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
        }
        else if(canvasObj.otherContent && canvasObj.otherContent.length > 0){
            lines = canvasObj.otherContent[0].resources;
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
            if(lines.length > 0){
                //console.log("Got lines to draw");
                linesToScreen(JSON.parse(JSON.stringify(lines)), restore, parsing);
            }
            else{ //list has no lines
                //console.log("no lines in what we got");
                $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
                $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
                $("#imgTop").css("height", "0px");
                $("#imgBottom img").css("top", "0px");
                $("#imgBottom").css("height", "inherit");
                $("#parsingBtn").css("box-shadow", "0px 0px 6px 5px yellow");
                if(userIsAdmin){
                    var message = $('<span>This canvas has no lines.  If you would like to create lines</span> <span style="color: blue;" onclick="hideWorkspaceForParsing()">click here</span>.\n\
                    Otherwise, you can <span style="color: red;" onclick="$(\'#noLineWarning\').hide()">dismiss this message</span>.');
                    $("#noLineConfirmation").empty();
                    $("#noLineConfirmation").append(message);
                }
                $("#noLineWarning").show();
                $("#captionsText").text("There are no lines for this canvas.");
                if(parsing){
                    hideWorkspaceForParsing();
                }
            }
            resetImageTools();
            updateURL("p");
        } //
        else{ //This canvas doesn't yet have a list created for it.  Prepare to create one on first line parsing.
            annoLists[currentFolio-1 ] = "empty";
            transcriptionFolios[currentFolio-1].otherContent = [];
            if(userIsAdmin){
                var message = $('<span>This canvas has no lines.  If you would like to create lines</span> <span style="color: blue;" onclick="hideWorkspaceForParsing()">click here</span>.\n\
                Otherwise, you can <span style="color: red;" onclick="$(\'#noLineWarning\').hide()">dismiss this message</span>.');
                $("#noLineConfirmation").empty();
                $("#noLineConfirmation").append(message);
            }
            $("#noLineWarning").show();
            $("#captionsText").text("There are no lines for this canvas.");
            $("#transTemplateLoading").hide();
            $("#transcriptionTemplate").show();
            $('#transcriptionCanvas').css('height', $("#imgTop img").height() + "px");
            $('.lineColIndicatorArea').css('height', $("#imgTop img").height() + "px");
            $("#imgTop").css("height", "0px");
            $("#imgBottom img").css("top", "0px");
            $("#imgBottom").css("height", "inherit");
            $("#parsingBtn").css("box-shadow", "0px 0px 6px 5px yellow");
            resetImageTools();
            updateURL("p");
            if(parsing){
                hideWorkspaceForParsing();
            }
        }
        $(".pageTurnCover").hide();
    }
    

    function orderLines(lines){
        //https://www.sitepoint.com/sophisticated-sorting-in-javascript/
        var linesReturned = [];
        var linesByX = [];
        var linesByY = [];
        var linesXByY = [];
        //This will sort by x which will group things by columns.  
        var linesByXthenY = lines.sort(function(a,b){
            var lineax = parseInt(a.on.slice(a.on.indexOf("#xywh=") + 6).split(",")[0]);
            var linebx = parseInt(b.on.slice(b.on.indexOf("#xywh=") + 6).split(",")[0]);
            if(lineax === linebx){
                //This is a line in the same column, sort by top to bottom principles
                {
                    var lineay  = parseInt(a.on.slice(a.on.indexOf("#xywh=") + 6).split(",")[1]);
                    var lineby = parseInt(b.on.slice(b.on.indexOf("#xywh=") + 6).split(",")[1]);
                    return lineay-lineby;
                }
            }
            //This is a different column because x is different, sort by LTR principles
            return lineax-linebx;
        });
        return linesByXthenY;
    }
    
    /* Take line data, turn it into HTML elements and put them to the DOM */
    function linesToScreen(unlines, restore, parsing){
        var lines = orderLines(unlines);
        $("#noLineWarning").hide();
        var letterIndex = 0;
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        letters = letters.split("");
        var update = true;
        if($("#parsingDiv").is(":visible")){
            update = false;
        }
        var thisContent = "";
        var thisPlaceholder = "Enter a line transcription";
        var counter = -1;
        var colCounter = 1;
        var image = $('#imgTop img');
        var theHeight = image.height();
        var theWidth = image.width();
        $('#transcriptionCanvas').css('height', originalImageHeight +"px");
        $('.lineColIndicatorArea').css('height',originalImageHeight + "px");
        var ratio = 0;
        //should be the same as originalImageWidth/originalCanvasBeight2
        ratio = originalImageWidth / originalImageHeight;
        adjustRatio = ratio;
//        console.log("ratio for lines to screen");
//        console.log(theWidth + "/" +theHeight);
//        console.log(ratio);
        for(var i=0; i<lines.length;i++){
            //("line "+i);
            var goodLastLine = true;
            var line = lines[i];
            var lastLine = {};
            var col = letters[letterIndex];
            if(i>0){
                lastLine=lines[i-1];
                if(lastLine.on.indexOf("#xywh") === -1){
                    goodLastLine = false;
                }
            }
            var lastLineX = 10000;
            var lastLineWidth = -1;
            var lastLineTop = -2;
            var lastLineHeight = -2;
            var x,y,w,h = 0;
            var XYWHarray = [x,y,w,h];
            var lineURL = "";
            var lineID = -1;
            if(line.on !== undefined){
                lineURL = line.on;
            }
            else{
                //ERROR.  malformed line.
                update = false;
            }
            if(line["@id"] !== undefined && line["@id"]!=="" ){ //&& line['@id'].indexOf('annotationstore/annotation') >=0
                lineID = line['@id']; //.slice(line['@id'].lastIndexOf('line/') + 5)
            }
            else{
                //ERROR.  Malformed line. 
                update = false;
            }
            thisContent = "";
            if(lineURL.indexOf('#') > -1){ //current line string must contain this to be valid
                var XYWHsubstring = lineURL.substring(lineURL.lastIndexOf('#' + 1)); //xywh = 'x,y,w,h'
                if(lastLine.on){ //won't be true for first line
                    lastLineX = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[0];
                    lastLineWidth = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[2];
                    lastLineTop = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[1];
                    lastLineHeight = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[3];
                }                
                else if(i===0 && lines.length > 1){ /* Check for the variance with the first line */
                    lastLine = lines[0];
                     if(lastLine.on){
                         lastLineX = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[0];
                         lastLineWidth = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[2];
                         lastLineTop = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[1];
                         lastLineHeight = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[3];
                     }
                }
                if(XYWHsubstring.indexOf('=') > -1){ //string must contain this to be valid
                    var numberArray = XYWHsubstring.substring(lineURL.lastIndexOf('xywh=') + 5).split(',');
                    if(parseInt(lastLineTop) + parseInt(lastLineHeight) !== numberArray[1]){
                        //check for slight variance in top position.  Happens because of rounding percentage math that gets pixels to be an integer.
                        var num1 = parseInt(lastLineTop) + parseInt(lastLineHeight);
                        if(Math.abs(num1 - numberArray[1]) <= 4 && Math.abs(num1 - numberArray[1])!==0){
                            numberArray[1] = num1;
                            var newString = numberArray[0]+","+num1+","+numberArray[2]+","+numberArray[3];
                            if(i>0){
                                //to make the change cascade to the rest of the lines, we actually have to update the #xywh of the current line with the new value for y.
                                var lineOn = lineURL;
                                var index = lineOn.indexOf("#xywh=") + 6;
                                var newLineOn = lineOn.substr(0, index) + newString + lineOn.substr(index + newString.length);
                                lines[i].on = newLineOn;
                            }
                            
                        }
                        else{
                            //console.log("no difference");
                        }
                    }
                    if(numberArray.length === 4 && goodLastLine){ // string must have all 4 to be valid
                        x = numberArray[0];
                        w = numberArray[2];
                        if(lastLineX !== x){ //check if the last line's x value is equal to this line's x value (means same column)
                            if(goodLastLine){
                                if(Math.abs(x - lastLineX) <= 3){ //allow a 3 pixel  variance and fix this variance when necessary...
                                    //align them, call them the same Column. 
                                    /*
                                     * This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its intger position off of
                                     * percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
                                     * for here.  There may be better ways of handling this, but this is a good solution for now. 
                                     */
                                    if(lastLineWidth !== w){ //within "same" column (based on 3px variance).  Check the width
                                        if(Math.abs(w - lastLineWidth) <= 5){ //If the width of the line is within five pixels, automatically make the width equal to the last line's width.

                                            //align them, call them the same Column. 
                                            /*
                                             * This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its intger position off of
                                             * percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
                                             * for here.  There may be better ways of handling this, but this is a good solution for now. 
                                             */
                                            w = lastLineWidth;
                                            numberArray[2] = w;
                                        }
                                    }
                                    x = lastLineX;
                                    numberArray[0] = x;
                                }
                                else{ //we are in a new column, column indicator needs to increase. 
                                    if(lines.length > 1){ //only if we had a valid lastLine to do the comparison with should you trust this logic.
                                        letterIndex++;
                                        col = letters[letterIndex];
                                        colCounter = 1; //Reset line counter so that when the column changes the line# restarts?
                                    }
                                }
                            }
                        }
                        else{ //If the X value matches, we are in the same column and don't have to account for any variance or update the array.  Still check for slight width variance.. 
                            if(lastLineWidth !== w){
                                if(Math.abs(w - lastLineWidth) <= 5){ //within 5 pixels...

                                    //align them, call them the same Column. 
                                    /*
                                     * This is a consequence of #xywh for a resource needing to be an integer.  When I calculate its intger position off of
                                     * percentages, it is often a float and I have to round to write back.  This can cause a 1 or 2 pixel discrenpency, which I account
                                     * for here.  There may be better ways of handling this, but this is a good solution for now. 
                                     */
                                    w = lastLineWidth;
                                    numberArray[2] = w;
                                }
                            }
                        }
                        y = numberArray[1];
                        h = numberArray[3];
                        XYWHarray = [x,y,w,h];
                    }
                    else{
                        //ERROR! Malformed line
                        //update = false;
                        continue;
                    }
                }
                else{
                    //ERROR! Malformed line
                    //update = false;
                    continue;
                }
            }
            else{
                //ERROR!  Malformed line.  No coordinates. skip it. take it out of our cached lines.
                //lines.splice(i, 1);
                //update = false;
                continue;
            }
            
            if(goodLastLine){
                if(line.resource['cnt:chars'] !== undefined && line.resource['cnt:chars'] !== "" && line.resource['cnt:chars'] != "Enter a line transcription"){
                    thisContent = line.resource['cnt:chars'];
                }

                counter=parseInt(counter);
                counter += 1;
                
                var htmlSafeText = $("<div/>").text(thisContent).html();
                //var htmlSafeText2 = $("<div/>").text(thisNote).html();
                var newAnno = $('<div id="transcriptlet_' + counter + '" col="' + col
                    + '" colLineNum="' + colCounter + '" lineID="' + counter
                    + '" lineserverid="' + lineID + '" class="transcriptlet" data-answer="'
                    + escape(thisContent) + '"><textarea class="theText" placeholder="' + thisPlaceholder + '">'
                    + htmlSafeText + '</textarea></div>');           
                
                var left = parseFloat(XYWHarray[0]) / (10 * ratio);
                var top = parseFloat(XYWHarray[1]) / 10;
                var width = parseFloat(XYWHarray[2]) / (10 * ratio);
                var height = parseFloat(XYWHarray[3]) / 10;
                newAnno.attr({
                    lineLeft: left,
                    lineTop: top,
                    lineWidth: width,
                    lineHeight: height,
                    counter: counter
                });
                
                $("#transcriptletArea").append(newAnno);
                var lineColumnIndicator = $("<div onclick='loadTranscriptlet("+counter+");' pair='"+col+""+colCounter+"' lineserverid='"+lineID+"' lineID='"+counter+"' class='lineColIndicator' style='left:"+left+"%; top:"+top+"%; width:"+width+"%; height:"+height+"%;'><div class\n\
                ='lineColOnLine' >"+col+""+colCounter+"</div></div>");
                var fullPageLineColumnIndicator = $("<div pair='"+col+""+colCounter+"' lineserverid='"+lineID+"' lineID='"+counter+"' class='lineColIndicator fullP'\n\
                onclick=\"updatePresentation($('#transcriptlet_"+counter+"'));\" style='left:"+left+"%; top:"+top+"%; width:"+width+"%; height:"+height+"%;'><div class\n\
                ='lineColOnLine' >"+col+""+colCounter+"</div></div>"); //TODO add click event to update presentation
                //Make sure the col/line pair sits vertically in the middle of the outlined line.  
                var lineHeight = originalCanvasHeight * (height/100) + "px"; //theHeight instead of originalCanvasHeight?
                lineColumnIndicator.find('.lineColOnLine').attr("style", "line-height:"+lineHeight+";");
                //Put to the DOM
                colCounter+=1;
                $(".lineColIndicatorArea").append(lineColumnIndicator);
                $("#fullPageSplitCanvas").append(fullPageLineColumnIndicator);
            }
        }
        //What is going on here
        if(update && $(".transcriptlet").eq(0) !== undefined){
            updatePresentation($(".transcriptlet").eq(0), parsing);
        }
        //we want automatic updating for the lines these texareas correspond to.
                //timer identifier
        $("textarea").keydown(function(e){
            e = e || window.event;
            var charCode = e.keyCode || e.which;
            //user has begun typing, clear the wait for an update
            if(charCode !== 27 && charCode !== 16 && charCode !== 17 && charCode !== 18){
                clearTimeout(typingTimer);
            }
            
        });
        $("textarea").keyup(function(e){
            e = e || window.event;
            var charCode = e.keyCode || e.which;
            if(charCode !== 27 && charCode !== 16 && charCode !== 17 && charCode !== 18){
                //Do not do any of this for the esc, shift, ctrl or alt
                var lineToUpdate = $(this).parent();
                clearTimeout(typingTimer);
                //when a user stops typing for 2 seconds, fire an update to get the new text.
                typingTimer = setTimeout(function(){
                    console.log("Typing timer fired");
                    updateLine(lineToUpdate, false, null);
                }, 2000);
            }
        });
        textSize();
        //With this, every time the lines are redrawn for a canvas, they are repopulated to the preview text split.
        //populatePreview(transcriptionFolios[currentFolio-1].otherContent[0].resources, transcriptionFolios[currentFolio-1].label, "currentPage", currentFolio-1);
        if(restore){
            restoreImageTools();
        }
        else{
            resetImageTools();
        }
        if(parsing){
            hideWorkspaceForParsing();
        }
    }
    
    /* Make the transcription interface focus to the transcriptlet passed in as the parameter. */
function updatePresentation(transcriptlet, parsing) {
    if (transcriptlet === undefined || transcriptlet === null){
        $("#imgTop").css("height", "0%");
        $("#imgBottom").css("height", "inherit");
        return false;
    }
    var currentCol = transcriptlet.attr("col");
    var currentColLineNum = parseInt(transcriptlet.attr("collinenum"));
    var transcriptletBefore = $(transcriptlet.prev());
    var currentColLine = currentCol + "" + currentColLineNum;
    if(currentColLine.indexOf("NaN")>-1 || currentColLine.indexOf("undefined")>-1 ){
        currentColLine = "**";
    }
    $("#currentColLine").html(currentColLine);
    if (parseInt(currentColLineNum) >= 1){
        if (transcriptletBefore.hasClass("transcriptlet")){
            var prevColLineNum = parseInt(transcriptletBefore.attr("collinenum"));
            var prevLineCol = transcriptletBefore.attr("col");
            var prevLineText = unescape(transcriptletBefore.attr("data-answer"));
            //var prevLineNote = unescape(transcriptletBefore.find(".notes").attr("data-answer"));
            $("#prevColLine").html(prevLineCol + "" + prevColLineNum).css("visibility","");
            $("#captionsText").text((prevLineText.length && prevLineText) || "This line is not transcribed.").attr("title",prevLineText);
        }
        else { //there is no previous line
            $("#prevColLine").html(prevLineCol + "" + prevColLineNum).css("visibility","hidden");
            $("#captionsText").html("You are on the first line.").next().html("");
        }
    }
    else { //this is a problem
        $("#prevColLine").html(currentCol + "" + currentColLineNum-1).css("visibility","hidden");
        $("#captionsText").html("ERROR.  NUMBERS ARE OFF").next().html("");
    }
    focusItem[0] = focusItem[1];
    focusItem[1] = transcriptlet;
    if ((focusItem[0] === null)
        || (focusItem[0].attr("id") !== focusItem[1].attr("id"))) {
        adjustImgs(setPositions(), parsing);
        swapTranscriptlet();
        // show previous line transcription
        $('#captions').css({
            opacity: 1
        });
    }
    else {
        adjustImgs(setPositions(), parsing);
        focusItem[1].prevAll(".transcriptlet").addClass("transcriptletBefore").removeClass("transcriptletAfter");
        focusItem[1].nextAll(".transcriptlet").addClass("transcriptletAfter").removeClass("transcriptletBefore");
    }
    // prevent textareas from going invisible and not moving out of the workspace
    if(focusItem[1].find('.theText')[0]){
        focusItem[1].removeClass("transcriptletBefore transcriptletAfter")
            .find('.theText')[0].focus();
    }
    // change prev/next at page edges
//    if($(".transcriptletBefore").size()===0){
//        $("#prevLine").hide();
//        $("#prevPage").show();
//    } else {
//        $("#prevLine").show();
//        $("#prevPage").hide();
//    }
//    if($(".transcriptletAfter").size()===0){
//        $("#nextLine").hide();
//        $("#nextPage").show();
//    } else {
//        $("#nextLine").show();
//        $("#nextPage").hide();
//    }
    adjustForMinimalLines();
}
    /* Helper for position focus onto a specific transcriptlet.  Makes sure workspace stays on screen. */
    function setPositions() {
        var bottomImageHeight = $("#imgBottom img").height(); //in a normal situation, this is already the correct natural height
        if(isPeeking){
            peekZoom(true, true); //cancel peekZooming before gathering the positions for the next line
            isPeeking = true; //However, we overwrite this so in adjustImgs() we know its this case. 
            bottomImageHeight = peekMemory[3]; //We need the original image height to get all this math right, not the height it is now, we stored it. 
        }
        bottomImageHeight = parseInt(bottomImageHeight);
        if (focusItem[1].attr("lineHeight") !== null) {
            var pairForBookmarkCol = focusItem[1].attr('col');
            var pairForBookmarkLine = parseInt(focusItem[1].attr('collinenum'));
            var pairForBookmark = pairForBookmarkCol + pairForBookmarkLine;
            var currentLineHeight = parseFloat(focusItem[1].attr("lineHeight"));
            var currentLineTop = parseFloat(focusItem[1].attr("lineTop"));
            var percentageFixed = 0;
            var imgTopHeightPercentage = 0.0; //value for the height of imgTop
            var imgTopHeightPx = 0;
            var bufferForImgTop = currentLineTop - 1.5;; // - 1.5 so there is a little space still shown between drawn line and workspace
            imgTopHeightPercentage = (currentLineHeight) + 3.5; //Add in some extra height to account for padding around active line and workspace

            var imgTopSize = (((imgTopHeightPercentage/100)*bottomImageHeight) / Page.height())*100;
            if(bufferForImgTop < 0){
                //in case the line was at the very tippy top and -1.5 brought it under 0.
                bufferForImgTop = 0;
            }
            var topImgPositionPx = ((-(bufferForImgTop) * bottomImageHeight) / 100);
            //var bottomImgPositionPercent = -(currentLineTop + currentLineHeight);
            var bottomImgPositionPx = -((currentLineTop + currentLineHeight) * bottomImageHeight / 100) + 15; //+15x to show more of the active line on the bottom image than just the bottom slice.

            /*
             * We may not be able to show the last line + the next line if there were two tall lines.
             * If there is a very tall line, it will want to push the transcription workspace off the screen.
             * The priority should be to show as much of the very tall line STARTING FROM THE BOTTOM of the line going towards the top
             * as possible while also adjusting to keep the workspace on screen. 
             * 
             */
            if (imgTopSize > 80){
                //We want to show as much of the big line we can from the bottom of the line towards the top. Workspace must stay on screen
                var bottomOfTallLine = currentLineTop + currentLineHeight;
                var workspaceHeight = 170; //$("#transWorkspace").height();
                var origHeight = imgTopHeightPercentage;
                //As tall as image top can be to leave room for the workspace and a little bit of image bottom
                imgTopHeightPercentage = ((Page.height() - workspaceHeight - 80) / bottomImageHeight) *  100; //this needs to be a percentage
                //The height percentage the workspace was bumped up for the imgTopHeight adjustment
                percentageFixed = (100-(origHeight - imgTopHeightPercentage))/100; //what percentage of the original amount is left
                //We must also bump the topImgPositionPx and bottomImgPositionPx by the same amount we fixed the workspace
                topImgPositionPx = -((bottomOfTallLine - imgTopHeightPercentage + percentageFixed)/100)*bottomImageHeight;
                bottomImgPositionPx = -(((bottomOfTallLine-percentageFixed)/100)*bottomImageHeight + 15);
            }

            /* This helps to account for lines at the very tippy top */
            if(topImgPositionPx <= -12){
                topImgPositionPx += 12;
            }
            if(bottomImgPositionPx <= -12){
                bottomImgPositionPx += 12;
            }
        }
        imgTopHeightPx = (imgTopHeightPercentage/100) * bottomImageHeight;
        //Return all line positions including the necessary adjustments for desired padding and positioning.  
        var positions = {
            imgTopHeight: imgTopHeightPercentage,
            imgTopHeightPx : imgTopHeightPx,
            bottomImgHeightPx: bottomImageHeight,
            topImgPositionPx : topImgPositionPx,
            bottomImgPositionPx: bottomImgPositionPx,
            activeLine: pairForBookmark
        };
        imgTopPositionRatio = positions.topImgPositionPx / bottomImageHeight;
        imgBottomPositionRatio = positions.bottomImgPositionPx / bottomImageHeight;
        return positions;
    }
  
   
  /**
   * Removes previous textarea and slides in the new focus.
   *
   * @see updatePresentation()
   */
    function swapTranscriptlet() {
      //focusItem[0].addClass("transcriptletBefore").removeClass('noTransition');
      // slide in the new transcriptlet
      focusItem[1].css({"width": "auto", "z-index": "5"});
      focusItem[1].removeClass("transcriptletBefore transcriptletAfter");
      focusItem[1].prevAll(".transcriptlet").addClass("transcriptletBefore").removeClass("transcriptletAfter");
      focusItem[1].nextAll(".transcriptlet").addClass("transcriptletAfter").removeClass("transcriptletBefore");
      //support hide/show of previous/next line buttons if no next/prev line.
//      if($('.transcriptletAfter').length == 0){
//          $('#nextTranscriptlet').hide();
//      }
//      else{
//          $('#nextTranscriptlet').show();
//      }
//      if($('.transcriptletBefore').length == 0){
//          $('#previousTranscriptlet').hide();
//      }
//      else{
//           $('#previousTranscriptlet').show();
//      }
    };
    
  /**
   * Aligns images and workspace using defined dimensions.
   *
   * @see maintainWorkspace()
   */
    function adjustImgs(positions, parsing) {
      //move background images above and below the workspace
        var lineToMakeActive = $(".lineColIndicator[pair='"+positions.activeLine+"']"); //:first
        
        //Use this to help control animations from changing a line while peek zoomed.  
        if(isPeeking){
            $("#imgBottom img, #imgBottom .lineColIndicatorArea, #imgBottom").addClass('noTransition');
            $("#imgTop").css({
              "height": positions.imgTopHeight + "%"
            })
            .find("img").css({
              top: positions.topImgPositionPx + "px",
              left: "0px"
            });
           $("#imgTop .lineColIndicatorArea").css({
              top: positions.topImgPositionPx + "px",
              left: "0px"
            });
            
            $("#imgBottom").find("img").animate({
              top: positions.bottomImgPositionPx  + "px",
              left: "0px"
            }, 250);

            $("#imgBottom .lineColIndicatorArea").animate({
              top: positions.bottomImgPositionPx  + "px",
              left: "0px"
            }, 250);
        }
        else{
            $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").addClass('noTransition');
            if(!parsing){
                //Only do this animation if not parsing, it causes some funkiness othewise
                $("#imgTop").animate({
                  "height": positions.imgTopHeight + "%"
                },250)
                .find("img").animate({
                  top: positions.topImgPositionPx + "px",
                  left: "0px"
                },250);

               $("#imgTop .lineColIndicatorArea").animate({
                  top: positions.topImgPositionPx + "px",
                  left: "0px"
                },250);

                $("#imgBottom").find("img").animate({
                  top: positions.bottomImgPositionPx  + "px",
                  left: "0px"
                },250);

                $("#imgBottom .lineColIndicatorArea").animate({
                  top: positions.bottomImgPositionPx  + "px",
                  left: "0px"
                },250); 
            }
        }
        
        if($('.activeLine').hasClass('linesHidden')){
            $('.activeLine').hide();
        }
        var activeColor = colorThisTime.replace(".4", "1");
        $(".lineColIndicator")
           .removeClass('activeLine')
           .css({
               "background-color":"transparent",
               "opacity" : ".36",
               "box-shadow": "none",
               "border" : "2px solid "+activeColor
        });
          lineToMakeActive.addClass("activeLine");
          //use the active line color to give the active line a little background color to make it stand out if the box shadow is not enough.
            if(controlsMemory.minLines){
                lineToMakeActive.css({
                    "box-shadow" : "0px 6px 2px -4px "+colorThisTime,
                    "opacity" : "1"
                });
            }
            else{
                 lineToMakeActive.css({
                    "box-shadow" : "0px 0px 15px 8px "+activeColor,
                    "border" : "2px solid "+activeColor,
                    "opacity" : ".75"
                });             
            }
            setTimeout(function(){ 
                $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").removeClass('noTransition');
                if(isPeeking){
                    peekZoom(false, positions); //restore peek zooming.  user fired a redraw while they were zooming (probably by changing lines)
                }
                else{
                    //$("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").removeClass('noTransition');
                }
            }, 300);
    }  
    
    /**
     * Helper function to move the line+column marker when toggling minimal line page setting.
     */
    function adjustForMinimalLines(){
        if(controlsMemory.minLines){
            $.each($(".lineColOnLine"), function(){$(this).css("line-height", ($(this).height() * 2)-15 + "px"); });
        }
        else{
            $.each($(".lineColOnLine"), function(){
                $(this).css("line-height", $(this).height() + "px");
            });
        }
    }
   
   /**
    *  Update the line information of the line currently focused on, then load the focus to a line that was clicked on 
    *  
    */
   function loadTranscriptlet(lineid){
        var currentLineServerID = focusItem[1].attr("lineserverid");
        if($('#transcriptlet_'+lineid).length > 0){
            clearTimeout(typingTimer);
            if(loggedInUser){
                var lineToUpdate = $(".transcriptlet[lineserverid='"+currentLineServerID+"']");
                updateLine(lineToUpdate, false, $('#transcriptlet_'+lineid));
            }
            else{
              var captionText1 = $("#captionsText").html();
              $("#captionsText").html("You are not logged in.");
              $('#captionsText').css("background-color", 'red');
              setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
              setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
              setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8');  $("#captionsText").html(captionText1); }, 1500);
            }

        }
        else{ //blink a caption warning
            var captionText = $("#captionsText").html();
            $("#captionsText").html("Cannot load this line.");
            $('#captionsText').css("background-color", 'red');
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
            setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8');  $("#captionsText").html(captionText); }, 1500);
        }
   }
  
    /*
     * The UI control for going the the next transcriptlet in the transcription. 
     */
    function nextTranscriptlet() {
        var nextID = parseInt(focusItem[1].attr('lineID')) + 1;
        var currentLineServerID = focusItem[1].attr("lineserverid");
        clearTimeout(typingTimer);
        if($('#transcriptlet_'+nextID).length > 0){
            if(loggedInUser){
                var lineToUpdate = $(".transcriptlet[lineserverid='"+currentLineServerID+"']");
                updateLine(lineToUpdate, false, $('#transcriptlet_'+nextID));
            }
            else{
              var captionText1 = $("#captionsText").html();
              $("#captionsText").html("You are not logged in.");
              $('#captionsText').css("background-color", 'red');
              setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
              setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
              setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8');  $("#captionsText").html(captionText1); }, 1500);
            }

        }
        else{ //blink a caption warning
            var captionText = $("#captionsText").html();
            $("#captionsText").html("You are on the last line! ");
            $('#captionsText').css("background-color", 'red');
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
            setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
            setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8');  $("#captionsText").html(captionText); }, 1500);
        }
    }
    
    /*
     * The UI control for going the the previous transcriptlet in the transcription. 
     */
    function previousTranscriptlet() {
        var prevID = parseFloat(focusItem[1].attr('lineID')) - 1;
        var currentLineServerID = focusItem[1].attr("lineServerID");
        //var currentLineText = focusItem[1].find('textarea').val();
        clearTimeout(typingTimer);
        if(prevID >= 0){
            if(loggedInUser){
                var lineToUpdate = $(".transcriptlet[lineserverid='"+currentLineServerID+"']");
                updateLine(lineToUpdate, false, $('#transcriptlet_'+prevID));
              }
              else{
                var captionText1 = $("#captionsText").html();
                $("#captionsText").html("You are not logged in.");
                $('#captionsText').css("background-color", 'red');
                setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
                setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
                setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8');  $("#captionsText").html(captionText1); }, 1500);
              }

          }
          else{
              //captions already say "You are on the first line"
              $('#captionsText').css("background-color", 'red');
              setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
              setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
              setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 1500);
          }
    }

    /*
     * 
     *Scrub XML tag text for encoding issues and prepare it for injection into text inline.
     */
    function scrub(thisText){
        var workingText = $("<div/>").text(thisText).html();
        var encodedText = [workingText];
        if (workingText.indexOf("&gt;")>-1){
            var open = workingText.indexOf("&lt;");
            var beginTags = new Array();
            var endTags = new Array();
            var i = 0;
            while (open > -1){
                beginTags[i] = open;
                var close = workingText.indexOf("&gt;",beginTags[i]);
                if (close > -1){
                    endTags[i] = (close+4);
                } else {
                    beginTags[0] = null;
                    break;}
                open = workingText.indexOf("&lt;",endTags[i]);
                i++;
            }
            //use endTags because it might be 1 shorter than beginTags
            var oeLen = endTags.length; 
            encodedText = [workingText.substring(0, beginTags[0])];
            for (i=0;i<oeLen;i++){
                encodedText.push("<span class='previewTag'>",
                    workingText.substring(beginTags[i], endTags[i]),
                    "</span>");
                if (i!=oeLen-1){
                    encodedText.push(workingText.substring(endTags[i], beginTags[i+1]));
            }
            }
        if(oeLen>0)encodedText.push(workingText.substring(endTags[oeLen-1]));
        }
        return encodedText.join("");
    }
  
    
    /** 
     * 
     * Allows workspace to be moved up and down on the screen.
     * Requires shift key to be held down.
     */
     function moveWorkspace(evt){
        $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").addClass('noTransition');
        var startImgTop = $("#imgTop").height();
        var startImgBottom = $("#imgBottom img").position().top;
        var startImgBottomH = $("#imgBottom").height();
        var mousedownPosition = evt.pageY;
        evt.preventDefault();
        $(dragHelper).appendTo("body");
        $(document)
        .disableSelection()
        .mousemove(function(event){

            var imgBtmSpot = startImgBottom - (event.pageY - mousedownPosition);
            $("#imgTop").height(startImgTop + event.pageY - mousedownPosition);
            $("#imgBottom").css({
                "height": startImgBottomH - (event.pageY - mousedownPosition)
            }).find("img").css({
                "top"   : startImgBottom - (event.pageY - mousedownPosition)
            });
            $("#imgBottom .lineColIndicatorArea").css("top", startImgBottom - (event.pageY - mousedownPosition)+"px");
            $("#dragHelper").css({
                top :   event.pageY - 90,
                left:   event.pageX - 90
            });
//            if(!event.altKey) unShiftInterface();
        })
        .mouseup(function(){
            $("#dragHelper").remove();
            $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").removeClass('noTransition');
            $(document)
            .enableSelection()
            .unbind("mousemove");
            isUnadjusted = false;
        });
    };
    
    /*
     * make the top image the only shown image at full screen.  
     */
    function fullTopImage(){
        $("#imgTop").css("height","100vh");
        $(".hideMe").hide();
        $(".showMe").show();
    }
    
    /* Start event listening to move the image in the transcirption interface */
     function startMoveImg(){
        $("#moveImage").addClass("selected");
        $(".transcriptlet").addClass("moveImage");
        $(".transcriptlet").children("textarea").attr("disabled", "");
        $("#imgTop, #imgBottom").css("cursor", "url("+"images/open_grab.png),auto");
        $("#imgTop,#imgBottom").mousedown(function(event){$("#imgTop, #imgBottom").css("cursor", "url("+"images/close_grab.png),auto");  moveImg(event);});
        //The event is unregistered in the keyup on newberryTrans.html
    }
    
    /** 
     * Allows manuscript image to be moved around.
     * Requires shift key to be held down.
     * Synchronizes movement of top and bottom images.
     * Bookmark bounding box moves with top image.
     */
     function moveImg(event){
        var startImgPositionX = parseFloat($("#imgTop img").css("left"));
        var startImgPositionY = parseInt($("#imgTop img").css("top"));
        var startBottomImgPositionX = parseInt($("#imgBottom img").css("left"));
        var startBottomImgPositionY = parseInt($("#imgBottom img").css("top"));
        var mousedownPositionX = event.pageX;
        var mousedownPositionY = event.pageY;
        event.preventDefault();
        $("#imgTop").trigger('mousemove');
        $("#imgBottom").trigger('mousemove');
        $(document)
        .disableSelection()
        .mousemove(function(event){
            $("#imgTop img").css({
                top :   startImgPositionY + event.pageY - mousedownPositionY,
                left:   startImgPositionX + event.pageX - mousedownPositionX
            });
            $("#imgTop .lineColIndicatorArea").css({
                top :   startImgPositionY + event.pageY - mousedownPositionY,
                left:   startImgPositionX + event.pageX - mousedownPositionX
            });
            $("#imgBottom img").css({
                top :   startBottomImgPositionY + event.pageY - mousedownPositionY,
                left:   startBottomImgPositionX + event.pageX - mousedownPositionX
            });
             $("#imgBottom .lineColIndicatorArea").css({
                top :   startBottomImgPositionY + event.pageY - mousedownPositionY,
                left:   startBottomImgPositionX + event.pageX - mousedownPositionX
            });
//            if(!event.altKey) unShiftInterface();
        })
        .mouseup(function(){
            $("#dragHelper").remove();
            $(document)
            .enableSelection()
            .unbind("mousemove");
            isUnadjusted = false;
            $("#imgTop, #imgBottom").css("cursor", "url("+"images/open_grab.png),auto");
            $("#imgTop").trigger('mousemove');
            $("#imgBottom").trigger('mousemove');
        });
        //These events are unregistered in keyup() on newberryTrans.html
    };
    
    /*
     * Bring a hidden workspace back to the interface.
     */
    function restoreWorkspace(){
        $("#imgBottom").show();
        $("#imgTop").show();
        $("#imgTop").removeClass("fixingParsing");
        $("#transWorkspace").show();
        $("#imgTop").css("width", "100%");
        $("#imgTop img").css({"height":"auto", "width":"100%"});
        $("#imgBottom").css("height", "inherit");
        if(focusItem[0] == null && focusItem[1] == null){
            updatePresentation($("#transcriptlet_0"));
        }
        else{
            updatePresentation(focusItem[1]);
        }
        
        $(".hideMe").show();
        $(".showMe").hide();
    //    var pageJumpIcons = $("#pageJump").parent().find("i");
    //    pageJumpIcons[0].setAttribute('onclick', 'firstFolio();');
    //    pageJumpIcons[1].setAttribute('onclick', 'previousFolio();');
    //    pageJumpIcons[2].setAttribute('onclick', 'nextFolio();');
    //    pageJumpIcons[3].setAttribute('onclick', 'lastFolio();');
        $("#prevCanvas").attr("onclick", "previousFolio();");
        $("#nextCanvas").attr("onclick", "nextFolio();");
        $("#pageJump").removeAttr("disabled");
    }
    
    /*
     * Hide the workspace so the user can see the most of the image.
     */
    function hideWorkspaceToSeeImage(which){
    if(which === "trans"){
        $("#transWorkspace").hide();
        var imgBtmTop = $("#imgBottom img").css("top");
        imgBtmTop = parseFloat(imgBtmTop) - 53;
        $("#imgBottom").css({
            "height": "100%"
        });
        $("#imgBottom img").css("top", imgBtmTop+"px");
//        $("#imgTop").hide();
        $(".hideMe").hide();
        $(".showMe").show();
    }
    else{
        $("#transWorkspace").hide();
        $("#imgTop").hide();
        $("#imgBottom img").css({
            "top" :"0%",
            "left":"0%"
        });
        $("#imgBottom .lineColIndicatorArea").css({
            "top": "0%"
        });
        $(".hideMe").hide();
        $(".showMe").show();
    }

}

    /*
     * Prepare the inspect UI
     */
    function magnify(imgFlag, event){
        //For separating out different imgs on which to zoom.  Right now it is just the transcription canvas.
        var container = ""; // #id of limit
        var img;
        if (imgFlag === "trans"){
            img = $("#transcriptionTemplate");
            container = "transcriptionCanvas";
            $("#magnifyTools").fadeIn(800);
            $("button[magnifyimg='trans']").addClass("selected");
        }
        else if (imgFlag === "compare"){
            img = $("#compareSplit");
            container = "compareSplit";
            $("#magnifyTools").fadeIn(800).css({
                "left":$("#compareSplit").css("left"),
                "top" : "100px"
            });
            $("button[magnifyimg='compare']").addClass("selected");
        }
        else if (imgFlag === "full"){
            img = $("#fullPageSplitCanvas");
            container = "fullPageSplitCanvas";
            $("#magnifyTools").fadeIn(800).css({
                "left":$("#fullPageSplit").css("left"),
                "top" : "100px"
            });
            $("button[magnifyimg='full']").addClass("selected");
        }
        $("#zoomDiv").show();
        $(".magnifyHelp").show();
        hideWorkspaceToSeeImage(imgFlag);
        $(".lineColIndicatorArea").hide();
        mouseZoom(img,container,event);
    };
    
    
    /**
* Creates a zoom on the image beneath the mouse for Inspect.
*
* @param $img jQuery img element to zoom on
* @param event Event
*/
function mouseZoom($img,container, event){
    isMagnifying = true;
    var contain = $("#"+container).offset();
    var imgURL = $img.find("img:first").attr("src");
    var page = $("#transcriptionTemplate");
    //collect information about the img

    var imgTop = $img.find("img").css("top");
    var imgLeft = $img.find("img").css("left");
    if(imgTop === "auto"){
        imgTop= $img.find("img").offset().top;
    }
    if(imgLeft === "auto")imgLeft= $img.find("img").offset().left;
    var imgDims = new Array(parseInt(imgLeft), parseInt(imgTop), $img.width(), $img.height());
    //build the zoomed div
    var zoomSize = (page.height() / 3 < 120) ? 120 : page.height() / 3;
    if(zoomSize > 400) zoomSize = 400;
    var zoomPos = new Array(event.pageX, event.pageY);
    $("#zoomDiv").css({
        "box-shadow"    : "2px 2px 5px black,15px 15px " + zoomSize / 3 + "px rgba(230,255,255,.8) inset,-15px -15px " + zoomSize / 3 + "px rgba(0,0,15,.4) inset",
        "width"         : zoomSize,
        "height"        : zoomSize,
        "left"          : zoomPos[0] + 3,
        "top"           : zoomPos[1] + 3 - $(document).scrollTop() - $(".magnifyBtn").offset().top , //+ imgOffset
        "background-position" : imgLeft+""+imgTop,
        "background-size"     : imgDims[2] * zoomMultiplier + "px",
        "background-image"    : "url('" + imgURL + "')"
    });
    $(document).on({
        mousemove: function(event){
            if (!isMagnifying) { //if (liveTool !== "image" && liveTool !== "compare") {
                $(document).off("mousemove");
                $("#zoomDiv").hide();
            }
            var mouseAt = new Array(event.pageX, event.pageY);
            if ( mouseAt[0] < contain.left
                || mouseAt[0] > contain.left+$("#"+container).width()
                || mouseAt[1] < contain.top
                || mouseAt[1] > contain.top+$("#"+container).height()){
                return false; // drop out, you've left containment
            }
            var zoomPos = new Array(mouseAt[0]-zoomSize/2,mouseAt[1]-zoomSize/2);
            var imgPos = new Array((imgDims[0]-mouseAt[0])*zoomMultiplier+zoomSize/2-3,(imgDims[1]-mouseAt[1])*zoomMultiplier+zoomSize/2-3); //3px border adjustment
            $("#zoomDiv").css({
                "left"  : zoomPos[0],
                "top"   : zoomPos[1] - $(document).scrollTop() , //+ imgOffset
                "background-size"     : imgDims[2] * zoomMultiplier + "px",
                "background-position" : imgPos[0] + "px " + imgPos[1] + "px"
            });
        }
    }, $img);
}

    function removeTransition(){
        $("#imgTop img").css("-webkit-transition", "");
        $("#imgTop img").css("-moz-transition", "");
        $("#imgTop img").css("-o-transition", "");
        $("#imgTop img").css("transition", "");

        $("#imgBottom img").css("-webkit-transition", "");
        $("#imgBottom img").css("-moz-transition", "");
        $("#imgBottom img").css("-o-transition", "");
        $("#imgBottom img").css("transition", "");

        $("#imgTop").css("-webkit-transition", "");
        $("#imgTop").css("-moz-transition", "");
        $("#imgTop").css("-o-transition", "");
        $("#imgTop").css("transition", "");

        $("#imgBottom").css("-webkit-transition", "");
        $("#imgBottom").css("-moz-transition", "");
        $("#imgBottom").css("-o-transition", "");
        $("#imgBottom").css("transition", "");
    };
    
    function restoreTransition(){
        $("#imgTop img").css("-webkit-transition", "left .5s, top .5s, width .5s");
        $("#imgTop img").css("-moz-transition", "left .5s, top .5s, width .5s");
        $("#imgTop img").css("-o-transition", "left .5s, top .5s, width .5s");
        $("#imgTop img").css("transition", "left .5s, top .5s, width .5s");

        $("#imgBottom img").css("-webkit-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom img").css("-moz-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom img").css("-o-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom img").css("transition", "left .5s, top .5s, width .5s");

        $("#imgTop").css("-webkit-transition", "left .5s, top .5s, width .5s");
        $("#imgTop").css("-moz-transition", "left .5s, top .5s, width .5s");
        $("#imgTop").css("-o-transition", "left .5s, top .5s, width .5s");
        $("#imgTop").css("transition", "left .5s, top .5s, width .5s");

        $("#imgBottom").css("-webkit-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom").css("-moz-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom").css("-o-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom").css("transition", "left .5s, top .5s, width .5s");
    };

    /**
     * Show/Hide the available Page Tools
     */
function toggleImgTools(event){
    var locationX = event.pageX;
    var locationY = event.pageY;
    $("#imageTools").css({
        "display":  "block",
        "left" : locationX + "px",
        "top" : locationY + 15 + "px"
    });
    $("#imageTools").draggable();
}

/*
 * Not sure if this is used?
 */
function toggleLineControls(event){
    var locationX = event.pageX;
    var locationY = event.pageY;
    $("#lineColControls").css({
        "display":  "block",
        "left" : locationX + "px",
        "top" : locationY + 15 + "px"
    });
    $("#lineColControls").draggable();
}

/*
 * Show/hide the xml tag area in the transcription workspace
 */
function toggleXMLTags(event){
    if($("#xmlTagFloat").is(":visible")){
        $("#xmlTagFloat").fadeOut();
    } else {
        $("#xmlTagFloat").css("display","flex").fadeIn();
    }
    $("#toggleXML").toggleClass('xml-tagged');
}

/*
 * Show/hide the special character area in the transcription workspace
 */
function toggleSpecialChars(event){
    if($("#specialCharsFloat").is(":visible")){
        $("#specialCharsFloat").fadeOut();
    } else {
        $("#specialCharsFloat").css("display","flex").fadeIn();
    }
    $("#toggleChars").toggleClass('special-charactered');
}
    
/** 
     * Sets screen for parsing tool use.
     * Slides the workspace down and scales the top img
     * to full height. From here, we need to load to interface
     * for the selected tool. 
*/
    function hideWorkspaceForParsing(){
        if(liveTool === "parsing"){
            return false;
        }
        $("#parsingSplit").find('.fullScreenTrans').unbind();
        $("#parsingSplit").find('.fullScreenTrans').bind("click", function(){
            fullPage(false, true); 
        });
        rememberControls();
        liveTool = "parsing";
        $("#parsingBtn").css("box-shadow: none;");
        imgTopOriginalTop = $("#imgTop img").css("top");
        
        if ($("#transcriptionTemplate").hasClass("ui-resizable")){
            $("#transcriptionTemplate").resizable('destroy');
        }
        //$("#transcriptionTemplate").css("max-width", "55%").css("width", "55%");
        $("#controlsSplit").hide();
        var ratio = originalCanvasWidth / originalCanvasHeight;
        var newCanvasWidth = originalCanvasWidth * .55;
        var newCanvasHeight = 1 / ratio * newCanvasWidth;

        if($(window).height() <= 625){ //This is the smallest height we allow
            newCanvasHeight = 625;
        }
        else if ($(window).height() <= originalCanvasHeight){ //allow it to be as tall as possible, but not taller.
            newCanvasHeight = $(window).height();
            newCanvasWidth = ratio*newCanvasHeight;
        }
        else if($(window).height() > originalCanvasHeight){ //I suppose this is possible for small images, so handle if its trying to be bigger than possible
            newCanvasHeight = originalCanvasHeight;
            newCanvasWidth = originalCanvasWidth;
        }

        if($(window).width() > 900){ //Whenever it gets less wide than this, it prioritizes height and stops resizing by width.
            var parsingSplitWidth = $("#parsingSplit").width();
            if($(window).width() < newCanvasWidth + parsingSplitWidth){
                newCanvasWidth = $(window).width() - parsingSplitWidth;
                newCanvasHeight = 1/ratio*newCanvasWidth;
            }
        }
        else{ //Just do nothing instead of calling it 900 wide so it defaults to the height math, maybe put a max up there too.
    //                     newCanvasWidth = 900;
    //                     newCanvasHeight = 1/ratio*newCanvasWidth;
        }
        if(screen.width == $(window).width() && screen.height == window.outerHeight){
            $(".centerInterface").css("text-align", "center"); //.css("background-color", "#e1f4fe")
        }
        else{
            $(".centerInterface").css("text-align", "left"); //.css("background-color", "#e1f4fe")
        }
        if(newCanvasHeight > window.innerHeight -40){ //never let the bottom of the image go off screen.
            newCanvasHeight = window.innerHeight - 40;
            newCanvasWidth = ratio * newCanvasHeight;
        }
        $(".centerInterface").hide();
        //Could add some effect here to make this feel smooth.  
        $("#transcriptionTemplate").css("width",newCanvasWidth + "px");
        $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
        $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
        $("#imgTop").css("height", newCanvasHeight + "px");
        $("#imgTop").css("width", newCanvasWidth + "px");
        $("#imgTop img").css({
            'height': newCanvasHeight + "px"
        });
        $("#splitScreenTools").attr("disabled", "disabled");
        //$("#prevCanvas").attr("onclick", "");
        //$("#nextCanvas").attr("onclick", "");
        $("#imgTop").addClass("fixingParsing");
        var topImg = $("#imgTop img");

        $("#tools").children("[id$='Split']").hide();
        $("#parsingSplit")
        .css({
            "display": "inline-block",
            //"height": window.innerHeight + "px"
        })
        .fadeIn();

        topImg.css({
            "top":"0px",
            "left":"0px",
            "overflow":"auto"
        });
        $("#imgTop .lineColIndicatorArea").css({
            "top":"0px",
            "left":"0px",
            "height":newCanvasHeight+"px"
        });
        
        $("#transWorkspace,#imgBottom").hide();
        $("#noLineWarning").hide();
        //window.setTimeout(function(){
        $("#imgTop img").css("width", "auto");
        $("#imgTop img").css("top", "0px");
        $("#transcriptionTemplate").css("width", "auto"); //fits canvas to image. $("#imgTop img").width() + "px".  Do we need a background color?
        $("#transcriptionCanvas").css("display", "block");
        //}, 500);
        //window.setTimeout(function(){
            //in here we can control what interface loads up.  writeLines
            //draws lines onto the new full size transcription image.
        $('.lineColIndicatorArea').hide();
        writeLines($("#imgTop img"));
        //}, 1200);
    }
    
    /** 
     * Overlays divs for each parsed line onto img indicated.
     * Divs receive different classes in different 
     *  
     * @param imgToParse img element lines will be represented over
     */
    function writeLines(imgToParse){
        $(".line,.parsing,.adjustable,.parsingColumn").remove(); //clear and old lines to put in updated ones
        var originalX = (imgToParse.width()/imgToParse.height())*1000;
        var setOfLines = [];
        var count = 0;
        //It would be great if we could just draw these from lines in memory, not the lines on the page...
        $(".transcriptlet").each(function(index){
            count++;
            setOfLines[index] = makeOverlayDiv($(this),originalX, count);
        });
        imgToParse.parent().append($(setOfLines.join("")));
        $(".pageTurnCover").hide();
        $(".centerInterface").fadeIn(600);
    }
    
    /*
     * The overlay for the lines in the parsing interface
     */
    function makeOverlayDiv(thisLine, originalX, cnt){
        var Y = parseFloat(thisLine.attr("lineTop"));
        var X = parseFloat(thisLine.attr("lineLeft"));
        var H = parseFloat(thisLine.attr("lineHeight"));
        var W = parseFloat(thisLine.attr("lineWidth"));
        var newY = (Y);
        var newX = (X);
        var newH = (H);
        var newW = (W);
        var hasTrans = false;
        if(thisLine.attr("data-answer") !== undefined && thisLine.attr("data-answer")!==""){
            hasTrans = true;
        }
        var lineOverlay = "<div class='parsing' lineid='" + (parseInt(cnt)-1) + "' style='top:"
            + newY + "%;left:" + newX + "%;height:"
            + newH + "%;width:" + newW + "%;' lineserverid='"
            + thisLine.attr('lineserverid') + "'linetop='"
            + Y + "'lineleft='" + X + "'lineheight='"
            + H + "'linewidth='" + W + "' hastranscription='"+hasTrans+"'></div>";
        return lineOverlay;
    }


    /* Reset the interface to the full screen transcription view. */
    function fullPage(parsing, load){
        //parsing means we changed pages while parsing
        //load means we went from the parsing interface to the transcription interface. 
        if ($("#overlay").is(":visible")) {
            $("#overlay").click();
            return false;
        }
        if(existingLocalChanges && (liveTool === "parsing" || liveTool === "scrollView")){
            showLocalChangesNotice();
            return false;
        }
        if(liveTool === "scrollView"){
            deactivateScrollView();
        }
        liveTool = "none";
        $(".line, .parsing, .adjustable,.parsingColumn").remove();
        isUnadjusted = isFullscreen = true;
        //currentFocus = "transcription" + focusItem[1].attr('id').substring(1);
        if($("#trascriptionTemplate").hasClass("ui-resizable")){
            $("#transcriptionTemplate").resizable('destroy');
        }
        $("#splitScreenTools").find('option:eq(0)').prop("selected", true);
        $("#transcriptionCanvas").css("width", "100%");
        $("#transcriptionCanvas").css("height", "auto");
        $("#transcriptionCanvas").css("max-height", "none");
        $("#transcriptionTemplate").css("width", "100%");
        $("#transcriptionTemplate").css("max-width", "100%");
        $("#transcriptionTemplate").css("max-height", "none");
        $("#transcriptionTemplate").css("height", "auto");
        $("#transcriptionTemplate").css("display", "inline-block");
        $("#canvasControls").removeClass("selected");
        $("#canvasControls").removeClass("peekZoomLockout");
        $("#zoomLock").removeClass("selected").removeClass("peekZoomLockout").removeAttr("disabled");
        $('.lineColIndicatorArea').css("max-height","none");
        $('.lineColIndicatorArea').show();
        $(".centerInterface").css("text-align", "left");
        $("#help").css({"left":"100%"}).fadeOut(1000);
        $("#fullScreenBtn").fadeOut(250);
        $("#parseOptions .tpenButton.selected").removeClass("selected");
        $(document).unbind("mousemove");
        $(document).unbind("mousedown");
        $(document).unbind("mouseup");
        isZoomed = false;
        $(".split").hide();
        $(".split").css("width", "43%");
//        //console.log("RESTORE WORKSPACE");
        $("#splitScreenTools").removeAttr("disabled");
        $("#splitScreenTools").show();
        var screenWidth = $(window).width();
        var adjustedHeightForFullscreen = (originalImageHeight / originalImageWidth) * screenWidth;
        $("#transcriptionCanvas").css("height", adjustedHeightForFullscreen+"px");
        $(".lineColIndicatorArea").css("height", adjustedHeightForFullscreen+"px");
        if(load){
            //We need to reload the canvas because we went to the transcription interface from the parsing interface, so there may be new information. 
            loadTranscriptionCanvas(transcriptionFolios[currentFolio-1], false, true, true);
        }
        if(parsing){
            //We changed pages while parsing.  We are simulating pageChangeWhileParsing = loadTranscriptionInterfaceForThatPage then openParsingInterfaceForThatPage
            //currentFolio will be set by pageJump(), firstFolio(), lastFolio(), nextFolio() or previousFolio().  That's how this knows which one to load.
            loadTranscriptionCanvas(transcriptionFolios[currentFolio-1], true, true, true);
        }
        else{
            //Don't restoreWorkspace() if we changed pages while parsing
            restoreWorkspace();
        }
        if(!load && !parsing){
            //Then we changed out of a split screen page and there is no need to reload or redraw anything.  However, if there are no lines, then we need to show the line message 
            var lines = transcriptionFolios[currentFolio-1].otherContent[0].resources || [];
            if(lines.length === 0){
                if(userIsAdmin){
                    var message = $('<span>This canvas has no lines.  If you would like to create lines</span> <span style="color: blue;" onclick="hideWorkspaceForParsing()">click here</span>.\n\
                    Otherwise, you can <span style="color: red;" onclick="$(\'#noLineWarning\').hide()">dismiss this message</span>.');
                    $("#noLineConfirmation").empty();
                    $("#noLineConfirmation").append(message);
                }
                $("#imgTop").css("height", "0%");
                $("#imgBottom img").css("top", "0px");
                $("#imgBottom").css("height", "inherit");
                $("#parsingBtn").css("box-shadow", "0px 0px 6px 5px yellow");
                $("#noLineWarning").show();
                $("#captionsText").text("There are no lines for this canvas.");
            }
        }
        unsetParsingInterface();
        setTimeout(function(){
          document.body.scrollTop = document.documentElement.scrollTop = 0;
        },1);
    }
/**
 * Scroll the transcription preview area to the current page's transcription
 * @return {undefined}
 */
function scrollTextPreview(){
    if($(".previewPage[currentPage]").length > 0){
        $('#previewDiv').animate({
            scrollTop: $(".previewPage[currentPage]").offset().top
        }, 100);
    }
}    

    /*
     * Split the interface to make room for avilable split tools.
     */
function splitPage(event, tool) {
    var resize = true;
    var newCanvasWidth = window.innerWidth * .55;
    var ratio = originalCanvasWidth / originalCanvasHeight;
    var fullPageMaxHeight = window.innerHeight - 125; //100 comes from buttons above image and topTrim
    var iframeDirectLink = "";
    $("#transcriptionTemplate").css({
        "width"   :   "55%",
        "display" : "inline-table"
    });
    $("#templateResizeBar").show();
    var splitWidthAdjustment = window.innerWidth - ($("#transcriptionTemplate").width() + 35) + "px";
    
    $("#fullScreenBtn")
        .fadeIn(250);
        $('.split').hide();
    
    var splitScreen = $("#" + tool + "Split");
    if(!splitScreen.size()){
        //Not sure what this is for...
    }
    splitScreen.css("display", "block");
    splitScreen.find('.fullScreenTrans').unbind();
    splitScreen.find(".fullScreenTrans").click(function(){
        fullPage(false, false);
    });
    $("#zoomLock").attr("disabled", "disabled").addClass("peekZoomLockout");
    if(tool==="controls"){
        if(liveTool === "controls"){
           // $("#canvasControls").removeClass("selected");
           //$ ("#zoomLock").removeClass("peekZoomLockout").removeAttr("disabled");
            return fullPage(false, false);
        }
        $("#canvasControls").addClass("selected");
        $("#transcriptionCanvas").css("width", Page.width()-200 + "px");
        $("#transcriptionTemplate").css("width", Page.width()-200 + "px");
        newCanvasWidth = Page.width()-200;
        $("#controlsSplit").show();
        resize = false; //interupts parsing resizing funcitonaliy, dont need to resize for this anyway.
    }
    else if(tool==="help"){
        if(liveTool === "help"){
            return fullPage(false, false);
        }
        $("#transcriptionCanvas").css("width", Page.width()-520 + "px");
        $("#transcriptionTemplate").css("width", Page.width()-520 + "px");
        newCanvasWidth = Page.width()-520;
        $("#helpSplit").show().height(Page.height()-$("#helpSplit").offset().top).scrollTop(0); // header space
        $("#helpContainer").height(Page.height()-$("#helpContainer").offset().top);
        resize = false; //interupts parsing resizing funcitonaliy, dont need to resize for this anyway.
    }
    else if(tool === "parsing"){
        resize=false;
    }
    else if(tool === "preview"){
        scrollTextPreview();
        $("#previewSplit").height(Page.height() - 40).scrollTop(0); // header space
        $("#previewSplit").css("width", splitWidthAdjustment);
        $("#previewDiv").height(fullPageMaxHeight);
        $("#previewSplit").show();
    }
    else if(tool === "fullPage"){ //set this to be the max height initially when the split happens.
        $("#fullPageImg").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
        $("#fullPageImg").css("max-width", splitWidthAdjustment);
        $("#fullPageSplitCanvas").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
        $("#fullPageSplitCanvas").css("max-width", splitWidthAdjustment); //If we want to keep the full image on page, it cant be taller than that.
        $("#fullPageSplitCanvas").height($("#fullPageImg").height());
        $("#fullPageSplitCanvas").width($("#fullPageImg").width());
        $(".fullP").each(function(i){
            this.title = $("#transcriptlet_"+i+" .theText").text();
        }).tooltip();
    }
    else if(tool === "compare"){
        $("#compareSplit img").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
        $("#compareSplit img").css("max-width", splitWidthAdjustment); //If we want to keep the full image on page, it cant be taller than that.
        $("#compareSplit").css("width", splitWidthAdjustment);
    }
    else if(tool === "partialTrans"){
        var currentCanvasLabel = transcriptionFolios[currentFolio-1]["label"];
        var utlID = "";    
        if(currentCanvasLabel.split("_").length - 1 === 2){ //Must be in format like FP_000_000
            //We need to get the UTL canvas id for this particular canvas to support direct linking to the transcription for this object
            utlID = currentCanvasLabel.substring(0,currentCanvasLabel.lastIndexOf("_")).toLowerCase();
            iframeDirectLink = buildIframeDirectLink("transcript/"+utlID+"?response_type=embed");
            $("#partialTransSplit").children("iframe").attr("data_src", iframeDirectLink);
        }
        else{
            //This is not a UTL canvas or a canvas with a different label format.  Default to list of partial trans
            //The default is already populated in the html, so do nothing and the default will fire.
        }
        splitScreen.find("iframe").attr("src", splitScreen.find("iframe").attr("data_src"));
        splitScreen.height(Page.height() - 40).scrollTop(0); // header space
        splitScreen.css("width", splitWidthAdjustment);
    }
    else if(tool === "essay"){
        var currentCanvasLabel = transcriptionFolios[currentFolio-1]["label"];
        var utlID = "";
        if(currentCanvasLabel.split("_").length - 1 === 2){ //Must be in format like FP_000_000
            //We need to get the UTL canvasID for this particular canvas to support direct linking to the essay for this object
            utlID = currentCanvasLabel.substring(0, currentCanvasLabel.lastIndexOf("_")).toLowerCase();
            iframeDirectLink = buildIframeDirectLink("essay/"+utlID+"?response_type=embed");
            $("#essaySplit").children("iframe").attr("data_src", iframeDirectLink);
        }
        else{
            //This is not a UTL canvas or a canvas with a different @id format.  Default to list of essays
            //The default is already populated in the html, so do nothing and the default will fire.
        }
        splitScreen.find("iframe").attr("src", splitScreen.find("iframe").attr("data_src"));
        splitScreen.height(Page.height() - 40).scrollTop(0); // header space
        splitScreen.css("width", splitWidthAdjustment);
    }
    else{
        splitScreen.find("iframe").attr("src", splitScreen.find("iframe").attr("data_src"));
        splitScreen.height(Page.height() - 40).scrollTop(0); // header space
        splitScreen.css("width", splitWidthAdjustment);
    }
    liveTool = tool;
    var newCanvasHeight = 1 / ratio * newCanvasWidth;
    var newImgBtmTop = imgBottomPositionRatio * newCanvasHeight;
    var newImgTopTop = imgTopPositionRatio * newCanvasHeight;
    $("#transcriptionCanvas").css({
        "width"   :   newCanvasWidth + "px",
        "height"   :   newCanvasHeight + "px"
    });
    $(".lineColIndicatorArea").css("height", newCanvasHeight + "px");
    $("#imgBottom img").css("top", newImgBtmTop + "px");
    $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
    $("#imgTop img").css("top", newImgTopTop + "px");
    $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
    
    if(resize){
        attachTemplateResize();
    } 
    else {
        detachTemplateResize();
        $("#templateResizeBar").hide();
    }
    setTimeout(function(){
        adjustForMinimalLines();
    }, 1000);
    
}
    /*
     * Make the lines in the Text Preview split be in order.
     */
    function forceOrderPreview(){
        var ordered = [];
        var length = $(".previewPage").length;
        for(var i=0; i<length; i++){
            //console.log("find order = "+i)
            var thisOne = $(".previewPage[order='"+i+"']");
            ordered.push(thisOne);
            if(i===length - 1){
                //console.log("append");
                $("#previewDiv").empty();
                $("#previewDiv").append(ordered);
            }
        }
        $("#previewSplit").css({
              "display": "inline-table"
//              "height" : splitHeight+"px",
//              "width" : splitWidth
            });
    }

/*
 * Prepare the UI for the Compare Page tool
 */
    function populateCompareSplit(folioIndex){
        var canvasIndex = folioIndex - 1;
        var compareSrc = transcriptionFolios[canvasIndex].images[0].resource["@id"];
        var currentCompareSrc = $(".compareImage").attr("src");
        if(currentCompareSrc !== compareSrc) $(".compareImage").attr("src", compareSrc);
    }
    
    /*
     * Go through all of the parsing lines and put them into columns;
     * @see linesToColumns()
     * Global Arrray: gatheredColumns
     * 
     */
    function gatherColumns(startIndex){
        var colX,colY,colW,colH;
        var lastColumnLine = -1;
        var linesInColumn = -1;
        var hasTranscription = false;
        if($(".parsing")[startIndex + 1]){
            var line = $(".parsing")[startIndex + 1];
//            //console.log("START");
//            //console.log(line);
            colX = parseFloat($(line).attr("lineleft"));
            colY = parseFloat($(line).attr("linetop"));
            colW = parseFloat($(line).attr("linewidth"));  
            var $lastLine = $(".parsing[lineleft='"+colX+"']:last");
//            //console.log("END");
//            //console.log($lastLine);
            colH = parseFloat($lastLine.attr("linetop"))-colY+parseFloat($lastLine.attr("lineheight"));

            var lastLineIndex = $(".parsing").index($lastLine);
//            //console.log("PUSH TO GATHERED COLUMNS");
            gatheredColumns.push([colX,colY,colW,colH,$(line).attr("lineserverid"),$lastLine.attr("lineserverid"),true]);
//            //console.log("RECURSIVE!");
            gatherColumns(lastLineIndex);
        }
    }
    
    /*
     * Delete a "column" (all the lines that make up a column) in the parsing interface.
     */
    function removeColumn(column, destroy){
        ////console.log("Called removed column for this column");
        ////console.log(column);
        if(!destroy){
            if(column.attr("hastranscription")==="true"){
                var cfrm = confirm("This column contains transcription data that will be lost.\n\nContinue?");
                if (!cfrm) return false;
            }
        }
        var colX = column.attr("lineleft");
        // collect lines from column
        var lines = $(".parsing[lineleft='"+colX+"']");;
        lines.addClass("deletable");
        removeColumnTranscriptlets(lines);
        column.hide("blind", 250, function() {
            //$("#destroyColumnInst").slideUp();
            //$("#destroyColumn").removeClass("ui-state-active");
        column.remove();
        });
     
    }
    
    /*
     * Delete all lines at once in the parsing interface.
     */   
    function destroyPage(){
        nextColumnToRemove = $(".parsingColumn:first");
        var colX = nextColumnToRemove.attr("lineleft");
        var lines = $(".parsing[lineleft='"+colX+"']");
        if(nextColumnToRemove.length > 0){
            removeColumnTranscriptlets(lines, true);
        }
        else{
            $(".destroyPage").html('All Columns Removed');
            //cleanupTranscriptlets(true);
        }
    }
    
    /* Make parsing interface turn the lines in the view into columns */
    function linesToColumns(){
        //update lines in case of changes
        gatheredColumns = []; //The array built by gatherColumns()
        $(".parsingColumn").remove();
        if ($(".parsing").size() == 0) return false;
        //writeLines($("#imgTop img"));
        //loop through lines to find column dimensions
        var columnParameters = new Array(); // x,y,w,h,startID,endID
        var i = 0;
        var colX,colY,colW,colH;
        var lastColumnLine = -1;
        var linesInColumn = -1;
        gatherColumns(-1); //Gets all columns into an array.
        //build columns
        var columns = [];
        for (var j = 0;j<gatheredColumns.length;j++){
            var parseImg = document.getElementById("imgTop").getElementsByTagName("img");
            var scaledX = gatheredColumns[j][0];
            var scaledY = gatheredColumns[j][1];
            var scaledW = gatheredColumns[j][2];
            var scaledH = gatheredColumns[j][3];
//            // recognize, alert, and adjust to out of bounds columns
            if (scaledX+scaledW > 100){
                // exceeded the right boundary of the image
                if (scaledX > 98){
                    scaledX = 98;
                    scaledW = 2;
                } else {
                    scaledW = 100-scaledX-1;
                };
            }
            if (scaledX < 0){
                // exceeded the left boundary of the image
                scaledW += scaledX;
                scaledX = 0;
            }
            if (scaledY+scaledH > 100){
                // exceeded the bottom boundary of the image
                if (scaledY > 98){
                    scaledY = 98;
                    scaledH = 2;
                } else {
                    scaledH = 100-scaledY-1;
                };
            }
            if (scaledY < 0){
                // exceeded the top boundary of the image
                scaledH += scaledY;
                scaledY = 0;
            }
            var startID = $(".parsing[lineleft='"+gatheredColumns[j][0]+"']:first").attr("lineserverid");
            var endID = $(".parsing[lineleft='"+gatheredColumns[j][0]+"']:last").attr("lineserverid");
            columns.push("<div class='parsingColumn' lineleft='",gatheredColumns[j][0],"'",
            " linetop='",gatheredColumns[j][1],"'",
            " linewidth='",gatheredColumns[j][2],"'",
            " lineheight='",gatheredColumns[j][3],"'",
            " hastranscription='",gatheredColumns[j][6]==true,"'",
            " startid='",startID,"'",
            " endid='",endID,"'",
            " style='top:",scaledY,"%;left:",scaledX,"%;width:",scaledW,"%;height:",scaledH,"%;'>",
            "</div>");
        }
        //attach columns
        $(parseImg).before(columns.join(""));
        // avoid events on .lines
        $('#imgTop').find('.parsing').css({
          'z-index': '-10'
        });
        
        $(".parsingColumn")
            .mouseenter(function(){
//                //console.log("mouse enter column");
                var lineInfo;
                lineInfo = $("#transcription"+($(this).index(".parsing")+1)).val();
                $("#lineInfo").empty().text(lineInfo).append("<div>" + $("#t"+($(this).index(".line")+1)).find(".counter").text() +"</div>").show();
                if (!isMagnifying){
                $(this).addClass("jumpLine");
                }
            })
            .mouseleave(function(){
//                //console.log("mouse leave coumn")
                $(".parsing").removeClass("jumpLine");
                $("#lineInfo").hide();
            })
            .click(function(event){
            });
        }
    
    /**
     * Allows for column adjustment in the parsing interface.
     */
     function adjustColumn(event){
        // if(!isMember && !permitParsing)return false;
        //prep for column adjustment
//        //console.log("adjustColumn");
        var thisColumnID = new Array(2);
        var thisColumn;
        var adjustment = "";
        var originalPercentW;
        var originalPercentX;
        $.each($(".parsingColumn"),function(){
            if($(this).hasClass("ui-resizable")){
                $(this).resizable("destroy");
            }
        });
        $(".parsingColumn").resizable({
            handles     : "n,s,w,e",
            containment : 'parent',
            start       : function(event,ui){
                detachWindowResize();
                $("#progress").html("Adjusting Columns - unsaved").fadeIn();
                $("#columnResizing").show();
                $("#sidebar").fadeIn();
                thisColumn = $(".ui-resizable-resizing");
                thisColumnID = [thisColumn.attr("startid"),thisColumn.attr("endid")];
                adjustment = "new";
                originalPercentW = parseFloat($(this).attr("linewidth"));
                originalPercentX = parseFloat($(this).attr("lineleft"));

            },
            resize      : function(event,ui){
                if(adjustment=="new"){
                    var originalX = ui.originalPosition.left;
                    var originalY = ui.originalPosition.top;
                    var originalW = ui.originalSize.width;
                    var originalH = ui.originalSize.height;
                    var newX = ui.position.left;
                    var newY = ui.position.top;
                    var newW = ui.size.width;
                    var newH = ui.size.height;
                    var offsetForBtm = $(event.target).position().top;
                    if (Math.abs(originalW-newW)>5) adjustment = "right";
                    if (Math.abs(originalH-newH)>5) adjustment = "bottom";
                    if (Math.abs(originalX-newX)>5) adjustment = "left";    // a left change would affect w and x, order matters
                    if (Math.abs(originalY-newY)>5) adjustment = "top";     // a top change would affect h and y, order matters
                    offsetForBtm = (offsetForBtm / $("#imgTop img").height()) * 100;
                    newH = (newH / $("#imgTop img").height()) * 100;
                    var actualBottom = newH + offsetForBtm;                   
                    $("#progress").html("Adjusting "+adjustment+" - unsaved");
                }
            },
            stop        : function(event,ui){
                attachWindowResize();
                $("#progress").html("Column Resized - Saving...");
                $("#parsingCover").show();
                var parseRatio = $("#imgTop img").width() / $("#imgTop img").height();
//                console.log("ratio for adjust");
//                console.log($("#imgTop img").width()+"/"+$("#imgTop img").height());
//                console.log(parseRatio);
                var originalX = ui.originalPosition.left;
                var originalY = ui.originalPosition.top;
                var originalW = ui.originalSize.width;
                var originalH = ui.originalSize.height;
                var newX = ui.position.left;
                var newY = ui.position.top;
                var newW = ui.size.width;
                var newH = ui.size.height;
                var oldHeight, oldTop, oldLeft, newWidth, newLeft;
                //THESE ORIGINAL AND NEW VALUES ARE EVALUATED AS PIXELS, NOT PERCENTAGES
                if (adjustment === "top") {
                    newY = (newY / $("#imgTop img").height()) * 100;
                    originalY = (originalY / $("#imgTop img").height()) * 100;
                    //console.log("top");
                    //save a new height for the top line;
                    var startLine = $(".parsing[lineserverid='"+thisColumnID[0]+"']");
                    oldHeight = parseFloat(startLine.attr("lineheight"));
                    oldTop = parseFloat(startLine.attr("linetop"));

                    //This should be resized right now.  If it is a good resize, the lineheight will be > 0
                    startLine.attr({
                        "linetop"    : newY,
                        "lineheight" : oldHeight + oldTop - newY
                    });
                    startLine.css({
                        "top"    : newY +"%",
                        "height" : oldHeight + oldTop - newY +"%"
                    });
                    
                    if (parseFloat(startLine.attr("lineheight"))<0){
                            // top of the column is below the bottom of its top line
                            var newTopLine = startLine;
                            do {
                                newTopLine = startLine.next('.parsing');
                                removeLine(startLine, true);
                                removeTranscriptlet(startLine.attr("lineserverid"),startLine.attr("lineserverid"), true);
                                startLine = newTopLine;
                                oldHeight = parseFloat(startLine.attr("lineheight"));
                                oldTop = parseFloat(startLine.attr("linetop"));
                                
                            } while (parseFloat(startLine.attr("linetop")) + parseFloat(startLine.attr("lineheight")) < newY );
                            //Got through all the ones that needed removing, now I am on the one that needs resizing.
                            startLine.attr({
                                "linetop"    : newY,
                                "lineheight" : oldHeight + oldTop - newY
                            });
                            startLine.css({
                                "top"    : newY +"%",
                                "height" : oldHeight + oldTop - newY +"%"
                            });
                            thisColumn.attr("startid", startLine.attr("lineserverid"));
                        }
//                        else{
//                            updateLine(startLine, true, null);
//                        }
                        updateLine(startLine, true, null);
                        $("#progress").html("Column Saved").delay(1000).fadeOut(1000);
                    } 
                    else if(adjustment=="bottom"){
                        //console.log("bottom");
                        //technically, we want to track the bottom.  The bottom if the height + top offset
                        var offsetForBtm = $(event.target).position().top;
                        offsetForBtm = (offsetForBtm / $("#imgTop img").height()) * 100;
                        newH = (newH / $("#imgTop img").height()) * 100;
                        
                        var actualBottom = newH + offsetForBtm;
                        //save a new height for the bottom line
                        var endLine = $(".parsing[lineserverid='"+thisColumnID[1]+"']");
                        
                        oldHeight = parseFloat(endLine.attr("lineheight"));
                        oldTop = parseFloat(endLine.attr("linetop"));
                        originalH = (originalH / $("#imgTop img").height()) * 100
                        endLine.attr({
                            "lineheight" : oldHeight + (newH - originalH)
                        });
                        endLine.css({
                            "height" : oldHeight + (newH - originalH) + "%"
                        });
                        if (parseFloat(endLine.attr("linetop")) > actualBottom){
                            //the bottom line isnt large enough to account for the change, delete lines until we get to a  line that, wehn combined with the deleted lines
                            //can account for the requested change.
                            do {
                                oldHeight = parseFloat(endLine.attr("lineheight"));
                                oldTop = parseFloat(endLine.attr("linetop"));
                                var nextline = endLine.prev(".parsing");
                                endLine.remove();
                                removeLine(endLine, true);
                                removeTranscriptlet(endLine.attr("lineserverid"),endLine.attr("lineserverid"), true);                           
                                endLine=nextline;
                            } 
                            while (parseFloat(endLine.attr("linetop"))>actualBottom);
                            
                            var currentLineTop = parseFloat(endLine.attr("linetop"));
                            endLine.attr({
                                "lineheight" : actualBottom - currentLineTop
                            });
                            endLine.css({
                                "height" : actualBottom - currentLineTop + "%"
                            });
                            thisColumn.attr("endid", endLine.attr("lineserverid"));
                        }
//                        else{
//                            updateLine(endLine, true, null);
//                        }
                        updateLine(endLine, true, null);
                        $("#progress").html("Column Saved").delay(1000).fadeOut(1000);
                    }
                    else if(adjustment=="left"){
                            //save a new left,width for all these lines
                            var leftGuide = $(".parsing[lineserverid='"+thisColumnID[0]+"']");
                            oldLeft = parseFloat(leftGuide.attr("lineleft"));
                            var ratio1 = originalPercentW / originalW;
                            var ratio2 = originalPercentX/ originalX;
                            newWidth = newW * ratio1;
                            newLeft = newX * ratio2;
                            $(".parsing[lineleft='"+oldLeft+"']").each(function(){
                                $(this).attr({
                                    "lineleft" : newLeft,
                                    "linewidth": newWidth
                                });
                                $(this).css({
                                    "left" : newLeft + "%",
                                    "width": newWidth + "%"
                                });
                            });
                            thisColumn.attr({
                                "lineleft" : newLeft,
                                "linewidth": newWidth
                            });
                            thisColumn.css({
                                "left" : newLeft + "%",
                                "width": newWidth + "%"
                            });
                            updateLinesInColumn(thisColumnID);
                            $("#progress").html("Column Saved").delay(1000).fadeOut(1000);
                            //cleanupTranscriptlets(true);
                        } 
                        else if (adjustment=="right"){
                            //save a new width for all these lines
                            var rightGuide = $(".parsing[lineserverid='"+thisColumnID[0]+"']");
                            oldLeft = parseFloat(rightGuide.attr("lineleft"));
                            var ratio1 = originalPercentW / originalW;
                            newWidth = newW * ratio1;
                            $(".parsing[lineleft='"+oldLeft+"']").each(function(){
                                $(this).attr({
                                    "linewidth": newWidth
                                });
                                $(this).css({
                                    "width": newWidth + "%"
                                });
                            });
                            thisColumn.attr({
                                "linewidth": newWidth
                            });
                            thisColumn.css({
                                "width": newWidth + "%"
                            });
                            updateLinesInColumn(thisColumnID);
                            $("#progress").html("Column Saved").delay(1000).fadeOut(1000);
                            //cleanupTranscriptlets(true);                            
                        } else {
                            $("#progress").html("No changes made.").delay(1000).fadeOut(1000);
                        }
                        $("#lineResizing").delay(1000).fadeOut(1000);
                        adjustment = "";
                        
                    }
            });
            $(".parsingColumn").on('resize', function (e) {
                e.stopPropagation();
            });
     }
    
    /*
    * Manage inserting a self closing vs not-self closing XML tag.
    */   
   function insertTag(tagName,fullTag){
        if (tagName.lastIndexOf("/") == (tagName.length-1)) {
            //transform self-closing tags
            var slashIndex = tagName.length;
            fullTag = fullTag.slice(0,slashIndex)+fullTag.slice(slashIndex+1,-1)+" />";
        }
        // Check for wrapped tag
        if (!addchar(escape(fullTag),escape(tagName))) {
            closeTag(escape(tagName), escape(fullTag));
        }
        
    }
    
    /*
     * When a user clicks on the notification of an unclosed XML tag, close the tag inline with what text has been written.
     */
    function closeTag(tagName,fullTag){
        // Do not create for self-closing tags
        if (tagName.lastIndexOf("/") == (tagName.length-1)) return false;
        var tagLineID = focusItem[1].attr("lineserverid");
        var closeTag = document.createElement("div");
        var tagID;
        $.get("tagTracker",{
            addTag      : true,
            tag         : tagName,
            projectID   : projectID,
            //folio       : folio,
            line        : tagLineID
        }, function(data){
            tagID = data;
            $(closeTag).attr({
                "class"     :   "tags ui-corner-all right ui-state-error",
                "title"     :   unescape(fullTag),
                "data-line" :   tagLineID,
                //"data-folio":   folio,
                "data-tagID":   tagID
            }).text("/"+tagName);
            focusItem[1].children(".xmlClosingTags").append(closeTag);
        });
    }
    
    /*
     * 
     * Add a special character inline to the transcription text. 
     */
    function addchar(theChar, closingTag)
    {
        //console.log("Add Char Called");
        var closeTag = (closingTag == undefined) ? "" : closingTag;
        var e = focusItem[1].find('textarea')[0];
        if(e!=null) {
            //Data.makeUnsaved();
            return setCursorPosition(e,insertAtCursor(theChar,closeTag,theChar,true));
        }
        return false;
    }
    
    /*
     * 
     * Move the cursor in the transcription text to the appropriate location baased on a character insertion action.
     */
    function setCursorPosition(e, position)
    {
        //console.log("set cursor pos.");
        var pos = position;
        var clas="character";
        if(pos > 8){
            clas = "character2";
        }
        var wrapped = false;
        if (pos!==undefined && pos.toString().indexOf("wrapped") == 0) {
            pos = parseInt(pos.substr(7));
            wrapped = true;
        }
        e.focus();
        if(e.setSelectionRange) {
            e.setSelectionRange(pos,pos);
        }
        else if (e.createTextRange) {
            e = e.createTextRange();
            e.collapse(true);
            e.moveEnd(clas, pos);
            e.moveStart(clas, pos);
            e.select();
        }
        return wrapped;
    }
    
    /**
     * Inserts value at cursor location.
     *
     * @param myField element to insert into
     * @param myValue value to insert
     * @return int end of inserted value position
     */
     function insertAtCursor(myValue, closingTag, fullTag, specChar){
         //how do I pass the closing tag in?  How do i know if it exists?
        clearTimeout(typingTimer);
            //when a user stops typing for 2 seconds, fire an update to get the new text.
        typingTimer = setTimeout(function(){
            updateLine(focusItem[1], false, null);
        }, 2000);
        var myField = focusItem[1].find('.theText')[0];
        var closeTag = (closingTag == undefined) ? "" : unescape(closingTag);
        //IE support
        if(specChar){
             if (document.selection) {
                myField.focus();
                sel = document.selection.createRange();
                sel.text = unescape(myValue);
                //console.log("Need to advance cursor pos by 1..." +sel.selectionStart, sel.selectionStart+1 );
                sel.setSelectionRange(sel.selectionStart+1, sel.selectionStart+1);
                return sel+1;
                //updateLine($(myField).parent(), false, true);
            }
            //MOZILLA/NETSCAPE support
            else if (myField.selectionStart || myField.selectionStart == '0'){
                var startPosChar = myField.selectionStart;
                var endPos = myField.selectionEnd;
                var currentValue = myField.value;
                currentValue = currentValue.slice(0, startPosChar) + unescape(myValue) + currentValue.slice(startPosChar);
                myField.value = currentValue;
                myField.focus();
                //console.log("Need to advance cursor pos by 1..." +startPosChar, startPosChar+1 );
                myField.setSelectionRange(startPosChar+1, startPosChar+1);
                return startPosChar+1;
                //updateLine($(myField).parent(), false, true);
            }
            else{
                myField.value += myValue;
                return myField.length;
            }
        }
        else{ //its an xml tag
            if (document.selection) {
                if(fullTag === ""){
                    fullTag = "("+myValue+")";
                }
                myField.focus();
                sel = document.selection.createRange();
                sel.text = unescape(fullTag);
                //console.log("Need to advance cursor pos by "+fullTag.length+"..."+sel.selectionStart, sel.selectionStart+fullTag.length);
                sel.setSelectionRange(sel.selectionStart+fullTag.length, sel.selectionStart+fullTag.length);
                //updateLine($(myField).parent(), false, true);
                return sel+unescape(fullTag).length;
            }
            //MOZILLA/NETSCAPE support
            else if (myField.selectionStart || myField.selectionStart == '0') {
                var startPos = myField.selectionStart;
                var endPos = myField.selectionEnd;
                if(fullTag === ""){
                        fullTag = "<" + myValue +">";
                }
                if (startPos !== endPos) {

                    // something is selected, wrap it instead
                    var toWrap = myField.value.substring(startPos,endPos);
                    closeTag = "</" + myValue +">";
                    myField.value =
                          myField.value.substring(0, startPos)
                        + unescape(fullTag)
                        + toWrap
                        + closeTag
                        + myField.value.substring(endPos, myField.value.length);
                    myField.focus();
                    //console.log("Need to put cursor at end of highlighted spot... "+endPos);
                    myField.setSelectionRange(endPos+fullTag.length+closeTag.length, endPos+fullTag.length+closeTag.length);
                    //updateLine($(myField).parent(), false, true);

                }
                else {
                    myField.value = myField.value.substring(0, startPos)
                        + unescape(fullTag)
                        + myField.value.substring(startPos);
                    myField.focus();
                    //console.log("Move caret to startPos + tag length... "+startPos, startPos + fullTag.length);
                    myField.setSelectionRange(startPos+ fullTag.length, startPos+ fullTag.length);
                    //updateLine($(myField).parent(), false, true);
                    //closeAddedTag(myValue, fullTag);
                    return startPos+unescape(fullTag).length;
                }

            }
            else {
                if(fullTag === ""){
                    fullTag = "<"+myValue+">";
                }
                myField.value += unescape(fullTag);
                myField.focus();
                //console.log("Last case... "+myField.selectionStart, myField.selectionStart+ fullTag.length);
                myField.setSelectionRange(myField.selectionStart+ fullTag.length, myField.selectionStart+ fullTag.length);
                //updateLine($(myField).parent(), false, true);
                //closeAddedTag(myValue, fullTag);
                return myField.length;
            }

        }

    }

/* Change the page to the specified page from the drop down selection. */
function pageJump(page,parsing){
    var folioNum = parseInt(page); //1,2,3...
    var canvasToJumpTo = folioNum - 1; //0,1,2...
    if($("#parsingDiv").is(":visible")){
        parsing = true;
    }
    if(currentFolio !== folioNum && canvasToJumpTo >= 0){ //make sure the default option was not selected and that we are not jumping to the current folio 
        currentFolio = folioNum;
        $(".pageTurnCover").show();
        clearTimeout(typingTimer);
        if(parsing){
            currentFolio = folioNum;
            focusItem = [null, null];  
            fullPage(true, false);
            rememberControls();
            //loadTranscriptionCanvas(transcriptionFolios[canvasToJumpTo], parsing, true);
        }
        else{
            currentFolio = folioNum;
            focusItem = [null, null];  
            rememberControls();
            loadTranscriptionCanvas(transcriptionFolios[currentFolio-1], false, true, false);
        } 
    }
    else{
        //console.log("Loaded current or invalid page");
    }
}

function compareJump(folio){
    populateCompareSplit(folio);
}

/**
 * Make sure all image tools reset to their default values.
*/
function resetImageTools(){
    $("#brightnessSlider").slider("value", "100");
    $("#contrastSlider").slider("value", "100");
    if($("button[which='grayscale']").hasClass("selected")){
        toggleFilter("grayscale");
    }
    if($("button[which='invert']").hasClass("selected")){
        toggleFilter("invert");
    }
    if($("#zenLine").hasClass("selected")){
        $("#zenLine").remove("selected");
    }
    //We need to check the column controls
    if(!$("#minimalLines").hasClass("selected")){
        toggleMinimalLines();
    }
    if(!$("#showTheLines").hasClass("selected")){
        toggleLineMarkers();
    }
    if(!$("#showTheLabels").hasClass("selected")){
        toggleLineCol();
    } 
}

/**
 * Make sure all image tools reset to their previously selected values.
*/
function restoreImageTools(){
    $("#brightnessSlider").slider("value", controlsMemory.bright);
    $("#contrastSlider").slider("value", controlsMemory.contrast);
    if(controlsMemory.grayscale && !$("button[which='grayscale']").hasClass("selected")){
        toggleFilter("grayscale");
    }
    if(controlsMemory.invert && !$("button[which='invert']").hasClass("selected")){
        toggleFilter("invert");
    }
    if(controlsMemory.zenLine){
        toggleZenLine();
    }
    else{
        if(controlsMemory.minLines){
            toggleMinimalLines();
        }
        if(!controlsMemory.showLines){
            toggleLineMarkers();
        }
        if(!controlsMemory.showLabels){
            toggleLineCol();
        } 
    }
}

function restoreImageToolsFromZen(){
    $("#brightnessSlider").slider("value", controlsMemory.bright);
    $("#contrastSlider").slider("value", controlsMemory.contrast);
    if(controlsMemory.grayscale && !$("button[which='grayscale']").hasClass("selected")){
        toggleFilter("grayscale");
    }
    if(controlsMemory.invert && !$("button[which='invert']").hasClass("selected")){
        toggleFilter("invert");
    }
    if(controlsMemory.minLines&& !$("#minimalLines").hasClass("selected")){
        toggleMinimalLines();
    }
    if(controlsMemory.showLines){
        toggleLineMarkers();
    }
    if(controlsMemory.showLabels){
        toggleLineCol();
    } 
}

/* 
 * Make peek zomm lock so user does not have to hold to buttons down.
 */
function toggleLocking(){
    if($("#canvasControls").hasClass("selected")){
        $("#canvasControls").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
        return false;
    }
    if(isPeeking){
        if(!zoomLock){
            zoomLock = true;
            isPeeking = false;
            $("#zoomLock").addClass("selected");
        }
        else{
            //cancel it
            $("#zoomLock").removeClass("selected");
            peekZoom(true, {});
            zoomLock = false;
            isPeeking = false;
        }
    }
    else{
        zoomLock = !zoomLock;
        if(zoomLock){
            $("#zoomLock").addClass("selected");
            peekZoom(false, {});
        }
        else{
            $("#zoomLock").removeClass("selected");
            peekZoom(true, {});
        }
    }
    
}

/* Change color of lines on screen */
function markerColors(){
    /*
     * This function allows the user to go through annotation colors and decide what color the outlined lines are.
     * colorThisTime
     */
    var tempColorList = ["rgba(153,255,0,.4)", "rgba(0,255,204,.4)", "rgba(51,0,204,.4)", "rgba(204,255,0,.4)", "rgba(0,0,0,.4)", "rgba(255,255,255,.4)", "rgba(255,0,0,.4)"];
    if (colorList.length == 0){
        colorList = tempColorList;
    }
    colorThisTime = colorList[Math.floor(Math.random()*colorList.length)];
    colorList.splice(colorList.indexOf(colorThisTime),1);
    var oneToChange = colorThisTime.lastIndexOf(")") - 2;
    var borderColor = colorThisTime.substr(0, oneToChange) + '.2' + colorThisTime.substr(oneToChange + 1);
    var lineColor = colorThisTime.replace(".4", "1"); //make this color opacity 100
    if(controlsMemory.minLines){
        $('.lineColIndicator').css('border', '2px solid '+lineColor);
        $('.lineColOnLine').css({'border-left':'1px solid '+borderColor, 'color':lineColor});
        $('.activeLine').css('box-shadow', '0px 6px 2px -4px  '+colorThisTime);
    }
    else{
        $('.lineColIndicator').css('border', '2px solid '+lineColor);
        $('.lineColOnLine').css({'border-left':'1px solid '+borderColor, 'color':lineColor});
        $('.activeLine').css('box-shadow', '0px 0px 15px 8px '+lineColor); //keep this color opacity .4 until imgTop is hovered.
    }

}

/* use available functionality to switch between Zen and page defaults for line display. */
function toggleZenLine(){
    if($("#zenLine").hasClass("selected")){ //turn it off
        $("#zenLine").removeClass("selected");
        $("#zenLine").css("background-color", "#272727");
        if(controlsMemory.minLines){ //it was selected at the time and is active now
            //$("#minimalLines").css("background-color", "#8198AA");
        }
        else{ //It was not selected at the time and is active now
            toggleMinimalLines();
            //$("#minimalLines").css("background-color", "#272727");
        }
        controlsMemory.zenLine = false;
        restoreImageToolsFromZen();
    }
    else{ //turn it on
        rememberControlsForZen();
        //$("#zenLine").css("background-color", "#272727");
        if(!$("#minimalLines").hasClass("selected")){
            toggleMinimalLines();
            //$("#minimalLines").css("background-color", "#272727");
            controlsMemory.minLines = false;
        }
        else{
            //$("#minimalLines").css("background-color", "#272727");
        }
        if($("#showTheLines").hasClass("selected")){
            toggleLineMarkers();
        }
        if($("#showTheLabels").hasClass("selected")){
            toggleLineCol();
        } 
        $("#zenLine").addClass("selected");
        $("#zenLine").css("background-color", "#8198AA");
        controlsMemory.zenLine = true;
    }
}

/* Toggle the minimalist line setting */
function toggleMinimalLines(){
    if($("#zenLine").hasClass("selected")){
        $('#zenLine').fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
        return false;
    }
    if ($("#minimalLines").hasClass("selected")){ //Remove
        $("#minimalLines").removeClass("selected");
        //$("#minimalLines").css("background-color", "#272727");
        $('.lineColIndicator').removeClass("minimal");
        $('.lineColOnLine').removeClass("minimal");
        $('.activeLine').removeClass("minimal");
        var color2 = colorThisTime.replace(".4", "1");
        $('.activeLine').css('box-shadow', '0px 0px 15px 8px '+color2);
        $('.activeLine').css('opacity', '.75');        
    }
    else { //Add minimal lines settings
        $("#minimalLines").addClass("selected");
        //$("#minimalLines").css("background-color", "#8198AA");
        $('.lineColIndicator').addClass("minimal");
        $('.lineColOnLine').addClass("minimal");
        $('.activeLine').addClass("minimal");
        $('.activeLine').css('box-shadow', '0px 6px 2px -4px '+colorThisTime);//0px 9px 5px -5px
        $('.activeLine').css('opacity', '1');
    }
    controlsMemory.minLines = $("#minimalLines").hasClass("selected");
    adjustForMinimalLines();
}

/* Toggle the line/column indicators in the transcription interface. (A1, A2...) */
function toggleLineMarkers(){
    if($("#zenLine").hasClass("selected")){
        $('#zenLine').fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
        return false;
    }
    if($('#imgTop .lineColIndicator').length < 2){
        //Since there is only one line, there is no way to toggle.  Basically the button should be inactive until more than one line exists. 
        $("#showTheLines").addClass("selected");
        controlsMemory.showTheLines = true;
        return false;
    }
    if (($('#imgTop .lineColIndicator:first').is(":visible")&& $('#imgTop .lineColIndicator:eq(1)').is(":visible"))
            || $("#showTheLines").hasClass("selected")){ //see if a pair of lines are visible just in case you checked the active line first.
        $('.lineColIndicator').hide();
        $(".activeLine").show().addClass("linesHidden");
        $("#showTheLines").removeClass("selected");
    }
    else {
        $('.lineColIndicator').css("display", "block");
        $(".lineColIndicator").removeClass("linesHidden");
        $("#showTheLines").addClass("selected");
        adjustForMinimalLines();
    }
    controlsMemory.showTheLines = $("#showTheLines").hasClass("selected");
}

/* Toggle the drawn lines in the transcription interface. */
function toggleLineCol(){
    if($("#zenLine").hasClass("selected")){
        $("#zenLine").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
        return false;
    }
    if ($("#showTheLabels").hasClass("selected")){
        $('.lineColOnLine').hide();
        $("#showTheLabels").removeClass("selected");
    }
    else {
        $('.lineColOnLine').show();
        $("#showTheLabels").addClass("selected");
    }
    adjustForMinimalLines();
    controlsMemory.showTheLabels = $("#showTheLabels").hasClass("selected");
}

    //updates lines
    function updateLinesInColumn(column){
        var startLineID = column[0];
        var endLineID = column[1];
        var startLine = $(".parsing[lineserverid='"+startLineID+"']"); //Get the start line
        var nextLine = startLine.next(".parsing"); //Get the next line (potentially)
        var linesToUpdate = [];
        linesToUpdate.push(startLine); //push first line
        while(nextLine.length >0 && nextLine.attr("lineserverid") !== endLineID){ //if there is a next line and its not the last line in the column...
            linesToUpdate.push(nextLine);
            nextLine = nextLine.next(".parsing");
        }
        if(startLineID !== endLineID){ //push the last line, so long as it was also not the first line
            linesToUpdate.push($(".parsing[lineserverid='"+endLineID+"']")); //push last line
        }
        columnUpdate(linesToUpdate, startLineID);  
    }
    
    /* Bulk update for lines in a column. */
    /* TODO these should only store locally! */
    function columnUpdate(linesInColumn){
        //console.log("Doing batch update from column resize")
        var onCanvas = $("#transcriptionCanvas").attr("canvasid");
        currentFolio = parseInt(currentFolio);
        var lineTop, lineLeft, lineWidth, lineHeight = 0;
        var ratio = originalImageWidth / originalImageHeight; 
        //console.log(currentAnnoListResources);
        //Go over each line from the column resize.
        $.each(linesInColumn, function(){
            //console.log("line from column...");
            var line = $(this);
            lineTop = parseFloat(line.attr("linetop")) * 10 ;
            lineLeft = parseFloat(line.attr("lineleft")) * (10*ratio);
            lineWidth = parseFloat(line.attr("linewidth")) * (10*ratio);
            lineHeight = parseFloat(line.attr("lineheight")) * 10;

            //round up.
            lineTop = Math.round(lineTop,0);
            lineLeft = Math.round(lineLeft,0);
            lineWidth = Math.round(lineWidth,0);
            lineHeight = Math.round(lineHeight,0);

            line.css("width", line.attr("linewidth") + "%");

            var lineString = lineLeft+","+lineTop+","+lineWidth+","+lineHeight;
            var currentLineServerID = line.attr('lineserverid');
            var currentLineText = $(".transcriptlet[lineserverid='"+currentLineServerID+"']").find("textarea").val();
            if(currentLineText === undefined){
                currentLineText = "";
            }
            if(currentLineServerID.indexOf("/local/line") === -1){
                currentLineServerID = currentLineServerID + "/changed/line";
            }
            var dbLine = 
            {
                "@id" : currentLineServerID,
                "@type" : "oa:Annotation",
                "motivation" : "sc:painting",
                "resource" : {
                  "@type" : "cnt:ContentAsText",
                  "cnt:chars" : currentLineText
                },
                "on" : onCanvas+"#xywh="+lineString,
                "otherContent" : []
//                   "forProject": "TPEN_NL"
            };

            var index = - 1;
            //find the line in the anno list resources and replace its position with the new line resource.
            //console.log("Need to find line in anno list resources and update the array...");
            $.each(localParsingChanges[currentFolio-1].otherContent[0].resources, function(i){
                var idToCheck1 = this["@id"].replace("/changed/line", "").replace("/local/line", "");
                var idToCheck2 = currentLineServerID.replace("/changed/line", "").replace("/local/line", "");
                if(idToCheck1 === idToCheck2){
                    //console.log("found, updating index "+index);
                    localParsingChanges[currentFolio-1].otherContent[0].resources[i] = JSON.parse(JSON.stringify(dbLine));
                    return false;
                }
            });
        });
        storeChangesLocally(localParsingChanges[currentFolio-1].otherContent[0]);
        $("#parsingCover").hide();
    }
    
    /* Update line information for a particular line. */
    function updateLine(line, cleanup, loadingLine){
        if(lineUpdateWorking){
            //There is a small delay in animation when moving between lines, which fires this.
            //Don't let a trigger happy user fire this multiple times in that delay.  
            return false;
        }
        lineUpdateWorking = true;
        lineUpdateTimer = setTimeout(function(){
            $("#lineUpdateNotice").fadeIn(1000);
        }, 2300);
        clearTimeout(typingTimer);
        var onCanvas = $("#transcriptionCanvas").attr("canvasid");
        currentFolio = parseInt(currentFolio);
        var currentAnnoListID = annoLists[currentFolio-1];
        var lineTop, lineLeft, lineWidth, lineHeight = 0;
        var ratio = originalImageWidth / originalImageHeight; 

        lineTop = parseFloat(line.attr("linetop")) * 10 ;
        lineLeft = parseFloat(line.attr("lineleft")) * (10*ratio);
        lineWidth = parseFloat(line.attr("linewidth")) * (10*ratio);
        lineHeight = parseFloat(line.attr("lineheight")) * 10;
        
        //round up.
        lineTop = Math.round(lineTop,0);
        lineLeft = Math.round(lineLeft,0);
        lineWidth = Math.round(lineWidth,0);
        lineHeight = Math.round(lineHeight,0);
        
        //line.css("width", line.attr("linewidth") + "%");
        var lineString = lineLeft+","+lineTop+","+lineWidth+","+lineHeight;
        var currentLineServerID = line.attr('lineserverid');
        var currentLineText = $(".transcriptlet[lineserverid='"+currentLineServerID+"']").find("textarea").val();
        if(currentLineText === undefined){
            currentLineText = "";
        }
        var dbLine = 
        {
            "@id" : currentLineServerID,
            "@type" : "oa:Annotation",
            "motivation" : "sc:painting",
            "resource" : {
              "@type" : "cnt:ContentAsText",
              "cnt:chars" : currentLineText
            },
            "on" : onCanvas+"#xywh="+lineString,
            "otherContent" : []
//            "forProject": "TPEN_NL"
        };
        //cleanup is only true if parsing.  This means transcribing, but the text is the same.  no need to update.  
        if( !cleanup && currentLineText === unescape(line.attr("data-answer"))){
            //We only planned to update the text for this line.  If it hasn't changed, we can skip this update. 
            if(null !== loadingLine && undefined !== loadingLine){
                updatePresentation(loadingLine);
            }
            lineUpdateWorking = false;
            clearTimeout(lineUpdateTimer);
            $("#lineUpdateNotice").hide();
            return false;
        }

        if(currentAnnoListID !== "noList" && currentAnnoListID !== "empty"){
                //console.log(currentAnnoList);
                //console.log("Check list resources...");
                for(var z=0; z<localParsingChanges[currentFolio-1].otherContent[0].resources.length; z++){
                    var lineID = localParsingChanges[currentFolio-1].otherContent[0].resources[z]["@id"];
                    lineID = lineID.replace("/changed/line", ""); //It may be a line that was already changed being changed again.
                    if(lineID === currentLineServerID){
                        //console.log("update current anno list "+annoListID+" index " + index);
                        if(cleanup){
                            if(dbLine["@id"].indexOf("local/line") === -1){
                                //If we are changing a new line, it is staged for save.  Just store new values so when it is saved it has the updated values. 
                                dbLine["@id"] = dbLine["@id"] + "/changed/line";
                            }
                            localParsingChanges[currentFolio-1].otherContent[0].resources[z] = dbLine;
                            //It was a parsing.  Redraw lines for parsing interfac3e
                            storeChangesLocally(localParsingChanges[currentFolio-1].otherContent[0]);
                            line.attr("data-answer", escape(currentLineText));                       
                            lineUpdateWorking = false;
                            clearTimeout(lineUpdateTimer);
                            $("#lineUpdateNotice").hide();
                            break;
                        }
                        else{
                            //It was a transcribed line, only text has changed, update line and list now, do not redraw.
                            if(currentLineText !== unescape(line.attr("data-answer"))){
                                //The text has changed
                                //transcriptionFolios[currentFolio-1].otherContent[0].resources[z] = dbLine;
                                updateOnServer(dbLine)
                                .then(function(responseData, status, jqXHR){
                                    var updatedLine = responseData["new_obj_state"];
                                    var originalID = responseData["original_object_id"];
                                    if(!updatedLine){
                                        $(".trexHead").show();
                                        $("#genericIssue").show(1000);
                                        console.warn("The server could not save this new transcription text");
                                        return false;
                                    }
                                    if(liveTool === "parsing"){
                                        $(".parsing[lineserverid='"+originalID+"']").attr("lineserverid", updatedLine["@id"]);
                                    }
                                    else{
                                        $(".transcriptlet[lineserverid='"+originalID+"']").attr("lineserverid", updatedLine["@id"]);
                                    }
                                    transcriptionFolios[currentFolio-1].otherContent[0].resources[z] = updatedLine;
                                    updateOnServer(transcriptionFolios[currentFolio-1].otherContent[0])
                                    .then(function(responseData, status, jqXHR){
                                        var updatedList = responseData["new_obj_state"];
                                        var updatedID = jqXHR.getResponseHeader("Location") || updatedList["@id"];
                                        if(!updatedID){
                                            $(".trexHead").show();
                                            $("#genericIssue").show(1000);
                                            console.warn("The server could not update the list");
                                            return false;
                                        }
                                        annoLists[currentFolio-1] = updatedID;
                                        localParsingChanges[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(updatedList));
                                        transcriptionFolios[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(updatedList));
                                        existingLocalChanges = false;
                                        line.attr("data-answer", escape(currentLineText)); 
                                        $("#prevCanvas").attr("onclick", "previousFolio();");
                                        $("#nextCanvas").attr("onclick", "nextFolio();");
                                        $("#pageJump").removeAttr("disabled");
                                        $("#commitParsing").attr("disabled", "disabled");
                                        if(loadingLine){
                                            //Then we updated something because of next/prev line, so move to that line once the  action is complete.
                                            updatePresentation(loadingLine);
                                        }
                                        var colLetter = line.attr("col");
                                        var lineNum = line.attr("collinenum");
                                        var together = colLetter+lineNum;
                                        updateTranscriptionPreviewLine(together, currentLineText);
                                        lineUpdateWorking = false;
                                        clearTimeout(lineUpdateTimer);
                                        $("#lineUpdateNotice").hide();
                                    })
                                    .fail(function(responseData, status, jqXHR){
                                        $(".trexHead").show();
                                        $("#genericIssue").show(1000);
                                        console.warn("I could not update list on server 15");
                                        return false;
                                    });            
                                })
                                .fail(function(responseData, status, jqXHR){
                                    $(".trexHead").show();
                                    $("#genericIssue").show(1000);
                                    console.warn("I could update line on server 15");
                                    return false;
                                });
                            }
                            break;
                        }
                    }
                }                   
        }
        else if(currentAnnoListID == "empty"){
           //cannot update an empty list
           lineUpdateWorking = false;
           clearTimeout(lineUpdateTimer);
           $("#lineUpdateNotice").hide();
           console.warn("CANNOT UPDATE AN UNKNOWN LIST");
        }
        else if(currentAnnoListID == "noList"){ //If it is classic T-PEN, we need to update canvas resources
            currentFolio = parseInt(currentFolio);
            var index = -1;
            $.each(localParsingChanges[currentFolio-1].otherContent[0].resources, function(){
                index++;
                if(this["@id"] == currentLineServerID){
                    localParsingChanges[currentFolio-1].otherContent[0].resources[index] = JSON.parse(JSON.stringify(dbLine));
                }
            });
            line.attr("data-answer", escape(currentLineText));
            lineUpdateWorking = false;
            clearTimeout(lineUpdateTimer);
            $("#lineUpdateNotice").hide();
        }
        //Update the preview line dynamically with the line change.  An error is thrown if any of the updates above fail so this is not dependent on that.  
        $(".previewText[lineServerID='"+currentLineServerID+"']").html(scrub(line.val()));
    }
    
    /*
     * This should only save locally
     * @param {type} lineBefore
     * @param {type} newLine
     * @returns {undefined}
     */
    function saveNewLine(lineBefore, newLine){
        $("#parsingCover").show();
        var theURL = window.location.href;
        var projID = -1;
        if(!getURLVariable("projectID")){
            projID = theProjectID;
        }
        else{
            projID = getURLVariable("projectID");
        }
        
        var beforeIndex = -1;
        if(lineBefore !== undefined && lineBefore !== null){
            beforeIndex = parseInt(lineBefore.attr("linenum"));
        }
        var onCanvas = $("#transcriptionCanvas").attr("canvasid");
        var newLineTop, newLineLeft, newLineWidth, newLineHeight = 0;
        var ratio = originalImageWidth / originalImageHeight; 
        newLineTop = parseFloat(newLine.attr("linetop"));
        newLineLeft = parseFloat(newLine.attr("lineleft"));
        newLineWidth = parseFloat(newLine.attr("linewidth"));
        newLineHeight = parseFloat(newLine.attr("lineheight"));
        
        newLineTop = newLineTop * 10 ;
        newLineLeft = newLineLeft * (10*ratio);
        newLineWidth = newLineWidth * (10*ratio);
        newLineHeight = newLineHeight * 10;
        
        //round up.
        newLineTop = Math.round(newLineTop , 0);
        newLineLeft = Math.round(newLineLeft,0);
        newLineWidth = Math.round(newLineWidth,0);
        newLineHeight = Math.round(newLineHeight,0);
                       
        var lineString = onCanvas + "#xywh=" +newLineLeft+","+newLineTop+","+newLineWidth+","+newLineHeight;
        var currentLineText = "";
        if(currentLineText === undefined){
            currentLineText = "";
        }
        var d = new Date();
        var time = d.getTime();
        var localID = "tpen/local/line/"+time;
        var dbLine = 
            {
                "@id" : localID, //or localID
                "@type" : "oa:Annotation",
                "motivation" : "sc:painting",
                "resource" : {
                  "@type" : "cnt:ContentAsText",
                  "cnt:chars" : currentLineText
                },
                "on" : lineString,
                "otherContent":[]
//               "forProject": "TPEN_NL"
            };
            if(onCanvas !== undefined && onCanvas !== ""){
                $("div[newcol='"+true+"']").attr({
                "startid" : dbLine["@id"],
                "endid" : dbLine["@id"],
                "newcol":false
            });
            currentFolio = parseInt(currentFolio);
            var currentAnnoList = annoLists[currentFolio-1];
            var changedAnnoList = {};
            if(currentAnnoList !== "noList" && currentAnnoList !== "empty"){ // if it IIIF, we need to update the list
                changedAnnoList = localParsingChanges[currentFolio-1].otherContent[0];
                if(beforeIndex == -1){
                    $(".newColumn").attr({
                        "lineserverid" : dbLine["@id"],
                        "startid" : dbLine["@id"],
                        "endid" : dbLine["@id"],
                        "linenum" : $(".parsing").length
                    }).removeClass("newColumn");
                    //We drew a new column and we know the annotation list.  Store the localID with the column that was just created.  
                    newLine.attr("lineserverid", dbLine["@id"]);
                    changedAnnoList.resources.push(dbLine);
                }
                else{
                    //There was a clone that happened earlier, we need to overwrite the lineserverid of the line that was just created.
                    //@see splitLine()
                    $(".parsing[linenum='"+(beforeIndex+1)+"']").attr("lineserverid", dbLine["@id"]);
                    changedAnnoList.resources.splice(beforeIndex+1, 0, dbLine);
                }
                if(lineBefore !== undefined && lineBefore !== null){
                    //This means we haved saved a new line in a column.
                    //Need to add it into the local var here so updateLine() knows about it when it goes to storeChangesLocally()
                    localParsingChanges[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(changedAnnoList));
                    updateLine(lineBefore, true, null);
                    
                }
                else{
                    storeChangesLocally(changedAnnoList);
                }
            }
            else if(currentAnnoList == "empty"){ 
                //This means we know no AnnotationList was on the store for this canvas, and otherContent stored with the canvas object did not have the list.  Make a new one in this case. 
                //We want to do this for real, not just locally.  We will track parsing changes from this point forward locally. 
                dbLine["@id"] = ""; //avoids RERUM 400
                saveNewLineToServer(dbLine)
                .then(function(responseData, status, jqXHR){
                    var newLine = responseData["new_obj_state"];
                    var newAnnoList = 
                    {
                        "@type" : "sc:AnnotationList",
                        "@context" : "http://store.rerum.io/v1/context.json",
                        "on" : onCanvas,
//                           "originalAnnoID" : "",
//                            "version" : 1,
//                        "permission" : 0,
//                           "forkFromID" : "",
                        "resources" : [newLine],
                        "isPartOf" : ""+projID
                    };
                    $(".newColumn").attr({
                        "lineserverid" : newLine["@id"],
                        "startid" : dbLine["@id"],
                        "endid" : dbLine["@id"],
                        "linenum" : $(".parsing").length
                    });
                    saveNewLineToServer(newAnnoList)
                    .then(function(responseData, status, jqXHR){
                        var newObjState = responseData["new_obj_state"];
                        var newAnnoListID = jqXHR.getResponseHeader("Location") || newObjState["@id"];
                        if(!newAnnoListID){
                            $(".trexHead").show();
                            $("#genericIssue").show(1000);
                            console.warn("The update on the anno list failed.");
                            return false;
                        }
                        currentFolio = parseInt(currentFolio);
                        annoLists[currentFolio-1]= newAnnoListID;
                        //transcriptionFolios[currentFolio-1].resources = JSON.parse(JSON.stringify(newObjState.resources));
                        transcriptionFolios[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(newObjState));
                        localParsingChanges[currentFolio-1].otherContent[0] = JSON.parse(JSON.stringify(newObjState));
                        $("#parsingCover").hide();
                        $("#parsingSplit").find('.fullScreenTrans').unbind();
                        $("#parsingSplit").find('.fullScreenTrans').bind("click", function(){
                            currentFolio = parseInt(currentFolio);
                            fullPage(false, true); 
                        });
                    })
                    .fail(function(responseData, status, jqXHR){
                        $(".trexHead").show();
                        $("#genericIssue").show(1000);
                        console.warn("I could not the return from save new line.");
                        return false;
                    });
                })
                .fail(function(responseData, status, jqXHR){
                    console.warn("Could not save new line with new list");
                    $(".trexHead").show();
                    $("#genericIssue").show(1000);
                    return false;
                });
            }
        }
        else{
            alert("Cannot save line.  Canvas id is not present.");
            $(".trexHead").show();
            $("#genericIssue").show(1000);
        }              
    }
   
    /**
     * Inserts new transcriptlet when line is added.
     * Cleans up inter-transcriptlet relationships afterwards.
     * 
     * @param e line element to build transcriptlet from
     * @param afterThisID lineid of line before new transcriptlet
     * @param newLineID lineid of new line
     */
     function buildTranscriptlet(e, afterThisID, newServerID){
        var newLineID = $(".transcriptlet").length + 1;
        var isNotColumn = true;
        var newW = e.attr("linewidth");
        var newX = e.attr("lineleft");
        var newY = e.attr("linetop");
        var newH = e.attr("lineheight");
        if (afterThisID === -1) {
          // new column, find its placement
          afterThisID = $(".transcriptlet").eq(-1).attr("lineserverid") || -1;
          $(".transcriptlet").each(function(index) {
            if ($(this).find('lineLeft') > newX) {
              afterThisID = (index > 0) ? $(this).prev('.transcriptlet').attr("lineserverid") : -1;
              return false;
            }
          });
            isNotColumn = false;
        } 
        var $afterThis = $(".transcriptlet[lineserverid='"+afterThisID+"']");
        var newTranscriptlet = [
            "<div class='transcriptlet transcriptletBefore' id='transciptlet_",newLineID,
            "' lineserverid='",newServerID, // took out style DEBUG
            "lineheight= ",newH,
            "linewidth= ",newW,
            "linetop= ",newY,
            "lineleft= ",newX,
            "lineid= ", ,
            "col= ", ,
            "collinenum= ", ,
            "'>\n",
            "<span class='counter wLeft ui-corner-all ui-state-active ui-button'>Inserted Line</span>\n",
            "<textarea></textarea>\n",
            "</div>"];
        if (isNotColumn){
            //update transcriptlet that was split
            $afterThis.after(newTranscriptlet.join("")).find(".lineHeight").val($(".parsing[lineserverid='"+afterThisID+"']").attr("lineheight"));                    
        } 
        else {
            if (afterThisID === -1) {
            $   ("#entry").prepend(newTranscriptlet.join(""));
            } 
            else {
                    $afterThis.after(newTranscriptlet.join(""));
            }
        }
        $(e).attr("lineserverid", newServerID);
        
    }
    /**
     * Adds a line by splitting the current line where it was clicked.
     * 
     * @param e clicked line element
     * @see organizePage(e)
     */
     function splitLine(e,event){ 
         $("#parsingCover").show();
        //e is the line that was clicked in
        //This is where the click happened relative to img top.  In other words, where the click happened among the lines. 
        var originalLineHeight = $(e).height(); //-1 take one px off for the border
        $(".parsing").attr("newline", "false");
        var originalLineTop = $(e).offset().top - $("#imgTop").offset().top; // +1 Move down one px for the border.  
        //var originalLineTop = parseFloat($(e).css("top"));
        var clickInLines = event.pageY - $("#imgTop").offset().top;
        var lineOffset = $(e).offset().top - $("#imgTop").offset().top;
        var oldLineHeight = (clickInLines - lineOffset)/$("#imgTop").height() * 100;
        //var oldLineHeight = parseFloat($(e).css("height"));
        var newLineHeight = (originalLineHeight - (clickInLines - originalLineTop))/$("#imgTop").height() * 100;
        var newLineTop = (clickInLines/$("#imgTop").height()) * 100;
        var newLine = $(e).clone(true);
        
         $(e).css({
            "height"    :   oldLineHeight + "%"
        }).attr({
            "newline"   :   true,
            "lineheight" :  oldLineHeight
        });
              
        $(newLine).css({
            "height"    :   newLineHeight + "%",
            "top"       :   newLineTop + "%"
        }).attr({
            "newline"   :   true,
            "linetop"   :   newLineTop,
            "lineheight" : newLineHeight
        });
        
        $(e).after(newLine);
        var newNum = -1;
        $.each($(".parsing"), function(){
            newNum++;
            $(this).attr("linenum", newNum);
        });        
         saveNewLine($(e),newLine); 
        $("#progress").html("Line Added").fadeIn(1000).delay(1000).fadeOut(1000);
    }
    
    /**
 * Removes clicked line, merges if possible with the following line.
 * updateLine(e,additionalParameters) handles the original, resized line.
 *
 * @param e clicked line element from lineChange(e) via saveNewLine(e)
 * @see lineChange(e)
 * @see saveNewLine(e)
 */
    function removeLine(e, columnDelete, deleteOnly){
        $("#imageTip").hide();
        var removedLine = $(e);
        if (columnDelete){
            var lineID = "";
            removedLine.remove();
            return false;
        }
        else {
            if ($(e).attr("lineleft") == $(e).next(".parsing").attr("lineleft")) { //merge
                if(!deleteOnly){ //if user clicked to remove a line, then do not allow merging.  Only delete the last line.
                    removedLine = $(e).next();
                    var removedLineHeight = removedLine.attr("lineheight");
                    var currentLineHeight = $(e).attr("lineheight");
                    var newLineHeight = parseFloat(removedLineHeight) + parseFloat(currentLineHeight);
                    //var convertedNewLineHeight = newLineHeight / $("#imgTop").height() * 100;
                    var convertedNewLineHeight = newLineHeight;
                    var transcriptletToUpdate = $(".transcriptlet[lineserverid='"+$(e).attr('lineserverid')+"']");
                    $(e).css({
                        "height" :  convertedNewLineHeight + "%",
                        "top" :     $(e).css("top")
                    }).addClass("newDiv").attr({
                        "lineheight":   convertedNewLineHeight
                    });
                    transcriptletToUpdate.attr("lineheight", convertedNewLineHeight); //Need to put this on the transcriptlet so updateLine() passes the correct value. 
                }
                else{ //User is trying to delete a line that is not the last line, do nothing
                    $("#parsingCover").hide();
                    return false;
                }
            }
            else{ //user is deleting a line, could be merge or delete mode
                if(deleteOnly){ //this would mean it is delete happening in delete mode, so allow it.

                }
                else{ //this would mean it is a delete happening in merge mode.
                    alert("To delete a line, deactivate 'Merge Lines' and activate 'Remove Last Line'.");
                    $("#parsingCover").hide();
                    return false;
                }
            }
            var params = new Array({name:"remove", value:removedLine.attr("lineserverid")});

            if(deleteOnly){ //if we are in delete mode deleting a line
                if($(e).hasClass("deletable")){
                    var cfrm = confirm("Removing this line will remove any data contained as well.\n\nContinue?");
                    if (!cfrm){
                        $("#parsingCover").hide();
                        return false;
                    }
                    removeTranscriptlet(removedLine.attr("lineserverid"), $(e).attr("lineserverid"), true, "cover");
                    removedLine.remove();
                    return params;
                }
                else{
                    $("#parsingCover").hide();
                    return false;
                }
            }
            else{ //we are in merge mode merging a line, move forward with this functionality.
                removeTranscriptlet(removedLine.attr("lineserverid"), $(e).attr("lineserverid"), true, "cover");
                removedLine.remove();
                //$("#parsingCover").hide();
                return params;
            }

        }
    }
    
     /**
     * Removes transcriptlet when line is removed. Updates transcriplet
     * if line has been merged with previous.
     * 
     * @param lineid lineid to remove
     * @param updatedLineID lineid to be updated
     */
     function removeTranscriptlet(lineid, updatedLineID, draw, cover){
        // if(!isMember && !permitParsing)return false;
        //update remaining line, if needed
        $("#parsingCover").show();
        var updateText = "";
        var removeNextLine = false;
        if (lineid !== updatedLineID){
            removeNextLine = true;
            var removedLine1 = $(".parsing[lineserverid='"+lineid+"']");
            var removedLine2 = $(".transcriptlet[lineserverid='"+lineid+"']");
            var toUpdate =   $(".transcriptlet[lineserverid='"+updatedLineID+"']");
            var removedText =   $(".transcriptlet[lineserverid='"+lineid+"']").find("textarea").val();
            if(toUpdate.length === 0){ 
                //cleanupTranscriptlets() at the end of this function has removed all trascriptlets.  Check if parsing line exists, there will be no text.
                toUpdate = $(".parsing[lineserverid='" + updatedLineID + "']");
            }
            if(removedLine2.length === 0){ 
                //cleanupTranscriptlets() at the end of this function has removed all trascriptlets.  Check if parsing line exists, there will be no text.
                removedLine2 = removedLine1;
            }
            //If toUpdate or removedLine2 are of length 0 at this point, there will be an error because I will not have ID's to talk to the db with.
            if(toUpdate.length ==0 || removedLine2.length ==0){
                clearTimeout(typingTimer);
                $(".theText").attr("disabled","disabled");
                $("#parsingCover").focus();
                $(".trexHead").show();
                $("#genericIssue").show(1000);
                console.warn("Did not know line to remove.");

                return false;
            }
            toUpdate.find("textarea").val(function(){
                var thisValue = $(this).val();
                if (removedText !== undefined){
                   if(removedText !== "") thisValue += (" "+removedText);
                    updateText = thisValue;
                }
                return thisValue;
            });

        }
        else{
            //console.log("yes it is. delete!");
        }

        var index = -1;
        currentFolio = parseInt(currentFolio);
        var currentAnnoListID = annoLists[currentFolio-1];
        var currentAnnoList = [];
         if(currentAnnoListID !== "noList" && currentAnnoListID !== "empty"){ // if it IIIF, we need to update the list
                currentAnnoList = localParsingChanges[currentFolio-1].otherContent[0];
                var annoListID = currentAnnoList["@id"];
                //console.log(currentAnnoList.resources);
                for (var z=0; z<currentAnnoList.resources.length; z++){
                    var lineIDToCheck = "";
                    if(removeNextLine){
                        lineIDToCheck = lineid;
                        removedLine2.remove(); //remove the transcriptlet from UI
                    }
                    else{
                        lineIDToCheck = updatedLineID;
                    }
                    if(currentAnnoList.resources[z]["@id"] === lineIDToCheck){
                        currentAnnoList.resources.splice(z, 1);
                        if(!removeNextLine){
                            storeChangesLocally(currentAnnoList);
                        }
                        else{
                            updateLine(toUpdate, true, null);
                        }
                        break;
                    }
                }                                         
            //});
        }
        else if(currentAnnoListID == "empty"){
            //There is no anno list assosiated with this anno.  This is an error.
        }
        else{ //If it is classic T-PEN, we need to update canvas resources
            currentFolio = parseInt(currentFolio);
            $.each(localParsingChanges[currentFolio-1].otherContent[0].resources, function(i){
                if(this["@id"] == lineid){
                    localParsingChanges[currentFolio-1].otherContent[0].resources.splice(i, 1);
                    return false;
                    //update forreal
                }
            });
        } 
        //When it is just one line being removed, we need to redraw.  When its the whole column, we just delete. 
        //cleanupTranscriptlets(draw);
    
     }
     
     /* Remove all transcriptlets in a column */
     function removeColumnTranscriptlets(lines, recurse){
        var index = -1;
        currentFolio = parseInt(currentFolio);
        var currentAnnoListID = annoLists[currentFolio-1];
        var currentAnnoList = [];
        //console.log("removing transcriptlets from this list");
        //console.log(currentAnnoList);
         if(currentAnnoListID !== "noList" && currentAnnoListID !== "empty"){ // if it IIIF, we need to update the list
        //console.log("Get annos for column removal");
                currentAnnoList = localParsingChanges[currentFolio-1].otherContent[0];
                var annoListID = currentAnnoList["@id"];
                //console.log("got them");
                //console.log(currentAnnoList.resources);
                for(var l=lines.length-1; l>=0; l--){
                    var theLine = $(lines[l]);
                    var index2 = -1;
                     $.each(currentAnnoList.resources, function(){
                        var currentResource = this;
                        index2++;
                        //console.log(currentResource["@id"] +" == "+ theLine.attr("lineserverid")+"?")
                        if(currentResource["@id"] == theLine.attr("lineserverid")){
                            currentAnnoList.resources.splice(index2, 1);
                            //console.log(theLine);
                            //console.log("Delete from list " + theLine.attr("lineserverid")+" at index "+index2+".");
                            theLine.remove();
                        }
                     });

                    if(l===0){
                        //console.log("last line in column, update list");
                        //console.log(currentAnnoList.resources);
                        storeChangesLocally(currentAnnoList);
                        if(recurse){
                            nextColumnToRemove.remove();
                            destroyPage();
                        }
                        else{
                            //cleanupTranscriptlets(true);
                        }

                    }
                }
                
         }
         else{
             //It was not a part of the list, but we can still cleanup the transcriptlets from the interface.  This could happen when a object is fed to the 
             //transcription textarea who instead of using an annotation list used the resources[] field to store anno objects directly with the canvas.  
             //These changes will not save, they are purely UI manipulation.  An improper, view only object has been fed to the interface at this point, so this is intentional.
             for(var l=lines.length-1; l>=0; l--){
                  var theLine = $(lines[l]);
                  theLine.remove();
                  var lineID = theLine.attr("lineserverid");
                  //console.log("remove this line: "+lineID);
                  //console.log("remove tramscriptlets");
                  $(".transcriptlet[lineserverid='"+lineID+"']").remove(); //remove the transcriptlet
                  //console.log("remove trans drawn lines");
                  $(".lineColIndicator[lineserverid='"+lineID+"']").remove(); //Remove the line representing the transcriptlet
                  //console.log("remov preview line");
                  $(".previewLineNumber[lineserverid='"+lineID+"']").parent().remove(); //Remove the line in text preview of transcription.
                }
         }
         
     }
    
    /* Re draw transcriptlets from the Annotation List information. */
    function cleanupTranscriptlets(draw) {
        var transcriptlets = $(".transcriptlet");
        transcriptlets.remove();
        $(".lineColIndicatorArea").children(".lineColIndicator").remove();
        $("#parsingSplit").find('.fullScreenTrans').unbind();
        $("#parsingSplit").find('.fullScreenTrans').bind("click", function(){
            currentFolio = parseInt(currentFolio);
            fullPage(false, true); 
        });
    }
 
 /* Make some invalid information inside of folios valid empties */
function scrubFolios(){
    //you could even force create anno lists off of the existing resource here if you would like.  
    var cnt1 = -1;
    var empty = [];
    $.each(transcriptionFolios, function(){
        cnt1++;
        var canvasObj = this;
        if(canvasObj.resources && canvasObj.resources.length > 0){
            //alert("Canvas "+canvasObj["@id"]+" does not contain any transcription lines.");
            if(canvasObj.images === undefined || canvasObj.images === null){
                canvasObj.images = empty;
            }
            var cnt2 = -1;
            $.each(canvasObj.resources, function(){
                    cnt2 += 1;
                    if(this.resource && this.resource["@type"] && this.resource["@type"] === "dctypes:Image"){
                        canvasObj.images.push(this);
                        canvasObj.resources.splice(cnt2,1);
                        transcriptionFolios[cnt1] = canvasObj;
                    }
                });
        }
        if(null == canvasObj.otherContent){
            transcriptionFolios[cnt1].otherContent = empty;
        }
        });
}

/* quit the magnifying UI */
function stopMagnify(){
    isMagnifying = false;
    zoomMultiplier = 2;
    $(document).off("mousemove");
    $("#zoomDiv").removeClass("ui-state-active");
    $("#zoomDiv").hide();
    $(".magnifyBtn").removeClass("ui-state-active");
    $("#magnifyTools").fadeOut(800);
//                    $("#imgBottom img").css("top", imgBottomOriginal);
//                    $("#imgBottom .lineColIndicatorArea").css("top", imgBottomOriginal);
    $(".lineColIndicatorArea").show();
    $(".magnifyHelp").hide();
    $("button[magnifyimg='full']").removeClass("selected");
    $("button[magnifyimg='compare']").removeClass("selected");
    $("button[magnifyimg='trans']").removeClass("selected");
    restoreWorkspace();
}

/*
     * The Ctrl + Shfit functionality to zoom in on a transcription box.
     */
    function peekZoom(cancel, positions){
        var topImg = $("#imgTop img");
        var btmImg = $("#imgBottom img");
        var availableRoom = new Array (Page.height()-$(".navigation").height(),$("#transcriptionCanvas").width());
        var line = $("#imgBottom .activeLine");
        var limitIndex = (line.width()/line.height()> availableRoom[1]/availableRoom[0]) ? 1 : 0;
        var zoomRatio = (limitIndex === 1) ? availableRoom[1]/line.width() : availableRoom[0]/line.height();
        var imgDims = new Array(topImg.height(),topImg.width(),parseInt(topImg.css("left")),-line.position().top);
        if (!cancel){
            //zoom in
            //$("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").addClass('noTransition');
            if($(".parsing").size()>0){
                // Parsing tool is open
                return false;
            }
            
            if( Object.keys(positions).length > 0){
                //special handling for changing lines while peek zoomed.  We passed in the proper values to the function
                peekMemory = [positions.topImgPositionPx,positions.bottomImgPositionPx,positions.imgTopHeightPx, positions.bottomImgHeightPx];
            }
            else{
                //This is a fresh zoom, calculate values as normal
                peekMemory = [parseFloat(topImg.css("top")),parseFloat(btmImg.css("top")),$("#imgTop").css("height"), $("#imgBottom img").css("height")];
            }
            
           //The animation for changing lines while peek zoomed is a bit out of control, this is part 2 where everything has to be manipulated to zoom in.
            $("#imgTop .lineColIndicatorArea").fadeOut();
            var heightToUse = line.height() * zoomRatio + 88;
            //We need to check if we are over the maximum here
            if (heightToUse > (Page.height() * .8)){
                //Then this is a tall line and peek zooming isn't the greatest idea.            
               var workspaceHeight = 170; //$("#transWorkspace").height();
               heightToUse = Page.height() - workspaceHeight - 80; 
            }
            var maxWidth = imgDims[1] * zoomRatio / availableRoom[1] * 100;
            var mostLeft = Page.width() - (imgDims[1] * zoomRatio - 60);
            var leftToUse = -(line.position().left * zoomRatio) + 30;
            //Do not let left become as size that it will actually pull the image too far, there is a max so the right edge is the furtherst you can pull. 
            if(leftToUse < mostLeft){
                leftToUse = mostLeft;
            }
            $("#imgTop").css({
                "height"    : heightToUse //add 40 to give some padding for ascenders and descenders.  
            });
            topImg.css({
                "width"     : imgDims[1] * zoomRatio - 60, //make it so none of the area can sneak off the right of the page
                "left"      : leftToUse, //half of the width reduction so its an even correction for the left side of the page.
                "top"       : (imgDims[3] * zoomRatio) + 46, //Half of the height extension above to make it equal padding top and bottom
                "max-width" : maxWidth + "%"
            });
            //same adjustment as for the top image so things don't look skewed
            /*
            btmImg.css({
                "left"      : -(line.position().left * zoomRatio) + 50,
                "top"       : ((imgDims[3]-line.height()) * zoomRatio) + 68, 
                "width"     : imgDims[1] * zoomRatio - 100,
                "max-width" : imgDims[1] * zoomRatio / availableRoom[1] * 100 + "%"
            });
            */
            isPeeking = true;
            //when we end up calling setPositions(), we need to take into account that we are peeking and not to use the natural positioning.  
            //As we navigate lines, the new positioning will have to be written to these objects.  
            $("#canvasControls").attr("disabled", "disabled").addClass("peekZoomLockout");
            $("#pageJump").attr("disabled", "disabled").addClass("peekZoomLockout");
            $("#nextCanvas").attr("onclick", "").addClass("peekZoomLockout");
            $("#prevCanvas").attr("onclick", "").addClass("peekZoomLockout");
            $("#prevPage").attr("disabled", "disabled").addClass("peekZoomLockout");
            $("#nextPage").attr("disabled", "disabled").addClass("peekZoomLockout");
            $("#parsingBtn").attr("disabled", "disabled").addClass("peekZoomLockout");
            $("#magnify1").attr("disabled", "disabled").addClass("peekZoomLockout");
            $("#splitScreenTools").attr("disabled", "disabled").addClass("peekZoomLockout");
        } 
        else {
            //zoom out
            //$("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").removeClass('noTransition');
            //If we have changed lines, we no longer have a good peekMemory.  Maybe just loadTranscriptlet(activeLine).
            
            //The animation for changing lines while peek zoomed is a bit out of control, this is part 1 where everything has to be restored back to the original
            topImg.css({
                "width"     : "100%",
                "left"      : 0,
                "top"       : peekMemory[0],
                "max-width" : "100%"
            });
            /*
            btmImg.css({
                "width"     : "100%",
                "left"      : 0,
                "top"       : peekMemory[1],
                "max-width" : "100%"
            })*/
            $("#imgTop").css({
                "height"    : peekMemory[2]
            });
            
            /*
             * ERROR here, I cannot stop the lines from flashing.  Here is why: https://stackoverflow.com/questions/31537222/jquery-width-is-returning-percentage-width-instead-of-pixel-width
             * In short, they must be visible for the math or the code has to be rewritten not to use these objects in the math. 
             * 
             * */
            if(positions === true){
                
            }
            else{
                $("#imgTop .lineColIndicatorArea").fadeIn();
            }
            isPeeking = false;
            $("#canvasControls").removeAttr("disabled").removeClass("peekZoomLockout");
            $("#pageJump").removeAttr("disabled").removeClass("peekZoomLockout");
            $("#prevCanvas").attr("onclick", "previousFolio();").removeClass("peekZoomLockout");
            $("#nextCanvas").attr("onclick", "nextFolio();").removeClass("peekZoomLockout");
            $("#prevPage").removeAttr("disabled").removeClass("peekZoomLockout");
            $("#nextPage").removeAttr("disabled").removeClass("peekZoomLockout");
            $("#parsingBtn").removeAttr("disabled").removeClass("peekZoomLockout");
            $("#splitScreenTools").removeAttr("disabled").removeClass("peekZoomLockout");
            $("#magnify1").removeAttr("disabled").removeClass("peekZoomLockout");
        }
    };

/* Clear the resize function attached to the window element. */
    function detachWindowResize(){
        window.addEventListener('resize', function(event, ui) {
            
        });
    }
    
    /* Clear the resize function attached to the transcription template. */
    function detachTemplateResize(){
        if ($("#transcriptionTemplate").hasClass("ui-resizable")){
            $("#transcriptionTemplate").resizable("destroy");
        }
        //$("#transcriptionTemplate").resizable("destroy");
    }
    
    /* Set the resize function for the transcription template. */
    function attachTemplateResize(){
        var originalRatio = originalCanvasWidth / originalCanvasHeight;
        $("#transcriptionTemplate").resizable({
            handles:"e",
            disabled:false,
            minWidth: window.innerWidth / 2,
            maxWidth: window.innerWidth * .75,
            start: function(event, ui){
                detachWindowResize();
            },
            resize: function(event, ui) {
                var width = ui.size.width;
                var height = 1 / originalRatio * width;
                $("#transcriptionCanvas").css("height", height + "px").css("width", width + "px");
                $(".lineColIndicatorArea").css("height", height + "px");
                var splitWidth = window.innerWidth - (width + 35) + "px";
                
                //var newHeight1 = parseFloat($("#fullPageImg").height()) + parseFloat($("#fullPageSplit .toolLinks").height()); //For resizing properly when transcription template is resized
                //var newHeight2 = parseFloat($(".compareImage").height()) + parseFloat($("#compareSplit .toolLinks").height()); //For resizing properly when transcription template is resized
                var fullPageMaxHeight = window.innerHeight - 15; //100 comes from buttons above image and topTrim
                var splitScreen = $(".split:visible");
                splitScreen.find("img").css("max-width", splitWidth);
                splitScreen.css("width", splitWidth);
                splitScreen.height(Page.height() - 40).scrollTop(0); // header space
                $("#fullPageImg").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
                $("#fullPageSplitCanvas").height($("#fullPageImg").height());
                $("#fullPageSplitCanvas").width($("#fullPageImg").width());
                var newImgBtmTop = imgBottomPositionRatio * height;
                var newImgTopTop = imgTopPositionRatio * height;
                $("#imgBottom img").css("top", newImgBtmTop + "px");
                $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
                $("#imgTop img").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
            },
            stop: function(event, ui){
                attachWindowResize();
                adjustForMinimalLines();
                textSize();
            }
        });
        $("#transcriptionTemplate").on('resize', function (e) {
            e.stopPropagation();
        });
    }
    
    /** Set the resize function for the window element. 
     * Must explicitly set new height and width for percentages values in the DOM to take effect.
     * with resizing because the img top position puts it up off screen a little.
    */
    function attachWindowResize(){
        window.addEventListener('resize', function(event, ui) {
            detachTemplateResize();
            event.stopPropagation();
            var newImgBtmTop = "0px";
            var newImgTopTop = "0px";
            var ratio = originalCanvasWidth / originalCanvasHeight;
            var newCanvasWidth = $("#transcriptionCanvas").width();
            var newCanvasHeight = $("#transcriptionCanvas").height();
            var PAGEHEIGHT = Page.height();
            var PAGEWIDTH = Page.width();
            var widerThanTall = (parseInt(originalCanvasWidth) > parseInt(originalCanvasHeight));
            
            var parsingMaxHeight = PAGEHEIGHT - 35;
            if(liveTool === 'parsing'){
                var SPLITWIDTH = $("#parsingSplit").width();
                if(screen.width == $(window).width() && screen.height == window.outerHeight){
                    $(".centerInterface").css("text-align", "center"); //.css("background-color", "#e1f4fe");
                }
                else{
                    $(".centerInterface").css("text-align", "left"); //.css("background-color", "#e1f4fe");
                }
                if(PAGEHEIGHT <= 625){ //This is the smallest height we allow, unless the image is widerThanTall
                    if(!widerThanTall){
                        newCanvasHeight = 625;
                    }
                }
                else if (PAGEHEIGHT <= originalCanvasHeight){ //allow it to be as tall as possible, but not taller.
                    newCanvasHeight = parsingMaxHeight;
                    newCanvasWidth = ratio*newCanvasHeight;
                }
                else if(PAGEHEIGHT > originalCanvasHeight){ //I suppose this is possible for small images, so handle if its trying to be bigger than possible
                    newCanvasHeight = originalCanvasHeight;
                    newCanvasWidth = originalCanvasWidth;
                }

                if(PAGEWIDTH > 900){ //Whenever it is greater than 900 wide
                    if (PAGEWIDTH < newCanvasWidth + SPLITWIDTH){ //If the page width is less than that of the image width plus the split area
                        newCanvasWidth = PAGEWIDTH - SPLITWIDTH; //make sure it respects the split area's space
                        newCanvasHeight = 1/ratio*newCanvasWidth; //make the height of the canvas relative to this width
                        if(newCanvasHeight > parsingMaxHeight){
                            newCanvasHeight = parsingMaxHeight;
                            newCanvasWidth = ratio * newCanvasHeight;
                        }
                    }
                    if(widerThanTall){
                        $("#parsingSplit").show();
                    }
                }
                else{ //Whenever it is less than 900 wide
                    if(widerThanTall){ //if the image is wider than tall
                        newCanvasWidth = 900; //make it as wide as the limit.  The split area is hidden, we do not need to take it into account
                        newCanvasHeight = 1/ratio*newCanvasWidth; //make the height of the image what it needs to be for this width limit
                        if(newCanvasHeight > parsingMaxHeight){
                            newCanvasHeight = parsingMaxHeight;
                            newCanvasWidth = ratio * newCanvasHeight;
                        }
                        $("#parsingSplit").hide();
                    }
                    else{
                        //The math above will have done everything right for all the areas of an image that is taller than it is wide. 
                    }
                }

                $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
                $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
                $("#imgTop").css("height", newCanvasHeight + "px");
                $("#imgTop").css("width", newCanvasWidth + "px");
                $("#imgTop img").css({
                    'height': newCanvasHeight + "px"
                });
                
            } 
            else if(liveTool !== "" && liveTool!=="none"){
                newCanvasWidth = Page.width() * .55;
                newCanvasHeight = 1 / ratio * newCanvasWidth;
                var fullPageMaxHeight = window.innerHeight - 125; //120 comes from buttons above image and topTrim
                var splitScreen = $(".split:visible");
                var splitWidthAdjustment = window.innerWidth - (newCanvasWidth + 35) + "px";  
                if(liveTool === "controls"){
                    newCanvasWidth = Page.width()-200;
                    splitWidthAdjustment = 200;
                }
                splitScreen.find("img").css("max-width", splitWidthAdjustment);
                splitScreen.css("width", splitWidthAdjustment);
                splitScreen.height(Page.height() - 40).scrollTop(0); // header space
                $("#fullPageImg").css("max-height", fullPageMaxHeight); //If we want to keep the full image on page, it cant be taller than that.
                $("#fullPageSplitCanvas").css("height", $("#fullPageImg").height());
                $("#fullPageSplitCanvas").css("height", $("#fullPageImg").width());
                $("#transcriptionTemplate").css("width", newCanvasWidth + "px");
                $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
                $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
                newImgTopTop = imgTopPositionRatio * newCanvasHeight;
                $("#imgTop img").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
                $("#imgBottom img").css("top", newImgBtmTop + "px");
                $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
                $(".lineColIndicatorArea").css("height",newCanvasHeight+"px");
            }
            else{
                var newHeight = $("#imgTop img").height();
                newImgBtmTop = imgBottomPositionRatio * newHeight;
                newImgTopTop = imgTopPositionRatio * newHeight;
                $("#imgBottom img").css("top", newImgBtmTop + "px");
                $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
                $("#imgTop img").css("top", newImgTopTop + "px");
                $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
                $("#transcriptionCanvas").css("height",newHeight+"px");
                $(".lineColIndicatorArea").css("height",newHeight+"px");
                var splitScreen2 = $(".split:visible");
                var splitWidthAdjustment2 = window.innerWidth - (newCanvasWidth + 35) + "px";  
                splitScreen2.find("img").css("max-width", splitWidthAdjustment2);
                splitScreen2.css("width", splitWidthAdjustment2);
                splitScreen2.height(Page.height() - 40).scrollTop(0); // header space
            }
            adjustForMinimalLines();
            if(doit!==""){
                clearTimeout(doit);
                doit = "";
            }
            if(liveTool !== "parsing"){
                doit = setTimeout(attachTemplateResize, 100);
            }
            textSize();
            responsiveNavigation();
        });
    }
    
    /**
     * pull a variable by name from the URL
     */
    function getURLVariable(variable)
    {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
                var pair = vars[i].split("=");
                if(pair[0] == variable){return pair[1];}
        }
        return(false);
    }
    
    /**
     * set a variable by name in the URL
     */
    function replaceURLVariable(variable, value){
           var query = window.location.search.substring(1);
           var location = window.location.origin + window.location.pathname;
           var vars = query.split("&");
           var variables = "";
           for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if(pair[0] == variable){
                var newVar = pair[0]+"="+value;
                vars[i] = newVar;
                break;
            }
           }
           variables = vars.toString();
           variables = variables.replace(/,/g, "&");
           return(location + "?"+variables);
    }
    
    /**
     * Rewrite the URL in the address bar
     */
    function updateURL(piece, classic){
        var toAddressBar = document.location.href;
        //If nothing is passed in, just ensure the projectID is there.
        //console.log("does URL contain projectID?        "+getURLVariable("projectID"));
        if(!getURLVariable("projectID")){
            toAddressBar = "?projectID="+projectID;
        }
        //Any other variable will need to be replaced with its new value
        if(piece === "p"){
            if(!getURLVariable("p")){
                toAddressBar += "&p=" + tpenFolios[currentFolio-1].folioNumber;
            }
            else{
                toAddressBar = replaceURLVariable("p", tpenFolios[currentFolio-1].folioNumber);
            }
            var relocator = "project.html?"+"projectID="+projectID+"&p="+tpenFolios[currentFolio-1].folioNumber;
            $(".editButtons").attr("href", relocator);
        }  
        
        window.history.pushState("", "T&#8209;PEN Transcription", toAddressBar);
    }
    
    /**
     * Adjusts font-size in transcription and notes fields based on size of screen.
     * Minimum is 13px and maximum is 18px.
     *
     */
    function textSize() {
        var wrapperWidth = $('#transcriptionCanvas').width();
        var textSize = Math.floor(wrapperWidth / 60),
        resize = (textSize > 18) ? 18 : textSize,
        resize = (resize < 13) ? 13 : resize;
        $(".theText,.notes,#previous span,#helpPanels ul").css("font-size",resize+"px");
    };
    
    /*
     * The responsive functionality for resizing the window
     */
    function responsiveNavigation(severeCheck){
        if(!severeCheck && navMemory > 0 && $('.collapsed.navigation').size()){
            $('.collapsed.navigation').removeClass('collapsed severe');
            navMemory = 0;
        }
        var width = Page.width();
        var contentWidth = (function(){
            var w=0;
            $('.trimSection').each(function(){
                w+=$(this).width();
            });
            return w;
        })();
        var addClass = (severeCheck) ? "severe" : "collapsed";
        var trims = $(".trimSection:visible").length;
        if(contentWidth>width-(trims*20)){ // margin not accounted for otherwise
            // content is encroaching and will overlap
            $('.topTrim.navigation').addClass(addClass);
            navMemory = contentWidth;
            !severeCheck && responsiveNavigation(true);
        }
        var visibleButtons = $(".buttons button:visible").length + 1; //+1 for split screen 
        if(window.innerWidth < 700){
            //We could account for what buttons are visible, but this also controls the buttons to the side of the 
            //textarea in the .transcriptlet, so I think this minimum is good all around
            $('#transWorkspace .navigation').addClass(addClass);
            !severeCheck && responsiveNavigation(true);
        }
    }

    var Page = {
    /**
     *  Returns converted number to CSS consumable string rounded to n decimals.
     *
     *  @param num float unprocessed number representing an object dimension
     *  @param n number of decimal places to include in returned string
     *  @returns float in ##.## format (example shows n=2)
     */
    convertPercent: function(num,n){
        return Math.round(num*Math.pow(10,(n+2)))/Math.pow(10,n);
    },
    /**
     * Sloppy hack so .focus functions work in FireFox
     *
     * @param elem element to focus on
     */
    focusOn: function(elem){
        setTimeout("elem.focus()",0);
    },
    /**
     * Window dimensions.
     *
     * @return Integer width of visible page
     */
    width: function() {
        return window.innerWidth !== null? window.innerWidth: document.body !== null? document.body.clientWidth:null;
    },
    /**
     * Window dimensions.
     *
     * @return Integer height of visible page
     */
    height: function() {
        return window.innerHeight !== null? window.innerHeight: document.body !== null? document.body.clientHeight:null;
    }
};



// Shim console.log to avoid blowing up browsers without it
if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function () { };

function toggleScrollView(){
    if(liveTool === "scrollView"){
        deactivateScrollView();
    }
    else if(liveTool === "parsing"){
        activateScrollView();
    }
}

function deactivateScrollView(){
    $(".centerInterface").hide();
    $("#scrollView").html("Scroll View");
    $("body").css("overflow", "hidden"); //because of activateScrollView();
    $("#parsingSplit").css({ //because of activateScrollView();
        "position":"relative"
    });
    hideWorkspaceForParsing();
}

/**
 * Change the CSS properties of the elements in the view to support parsing a scroll.
 * Since scrolls are super tall, we want them to be as tall as possible, but not wider than the possible in their given container.  
 * @return {undefined}
 */
function activateScrollView(){
    //$("#transcriptionTemplate").css("max-width", "55%").css("width", "55%");
    liveTool = "scrollView";
     $(".centerInterface").hide();
    $("#scrollView").html("Normal View");
    var ratio = originalCanvasWidth / originalCanvasHeight;
    var newCanvasWidth = originalCanvasWidth * .55;
    var newCanvasHeight = 1 / ratio * newCanvasWidth;
    $("body").css("overflow", "visible"); //This is so the page can scroll. 
    if($(window).height() <= 625){ //This is the smallest height we allow
        newCanvasHeight = 625;
    }
    else if ($(window).height() <= originalCanvasHeight){ //allow it to be as tall as possible, but not taller.
        //newCanvasHeight = $(window).height();
        //newCanvasWidth = ratio*newCanvasHeight;
    }
    else if($(window).height() > originalCanvasHeight){ //I suppose this is possible for small images, so handle if its trying to be bigger than possible
        newCanvasHeight = originalCanvasHeight;
        newCanvasWidth = originalCanvasWidth;
    }

    if($(window).width() > 900){ //Whenever it gets less wide than this, it prioritizes height and stops resizing by width.
        if($(window).width() < newCanvasWidth + $("#parsingSplit").width()){
            newCanvasWidth = $(window).width() - $("#parsingSplit").width();
            newCanvasHeight = 1/ratio*newCanvasWidth;
        }
    }
    else{ //Just do nothing instead of calling it 900 wide so it defaults to the height math, maybe put a max up there too.
//                     newCanvasWidth = 900;
//                     newCanvasHeight = 1/ratio*newCanvasWidth;
    }
    $("#parsingSplit").css({
        "position":"fixed"
    });
    $(".centerInterface").css("text-align", "left");
    /*
    if(newCanvasHeight > window.innerHeight -40){ //never let the bottom of the image go off screen.
        newCanvasHeight = window.innerHeight - 40;
        newCanvasWidth = ratio * newCanvasHeight;
    }
    */
    //Could add some effect here to make this feel smooth.  
    $("#transcriptionTemplate").css("width",newCanvasWidth + "px");
    $("#transcriptionCanvas").css("height", newCanvasHeight + "px");
    $("#transcriptionCanvas").css("width", newCanvasWidth + "px");
    $("#imgTop").css("height", newCanvasHeight + "px");
    $("#imgTop").css("width", newCanvasWidth + "px");
    $("#imgTop img").css({
        'height': newCanvasHeight + "px"
    });
    $("#splitScreenTools").attr("disabled", "disabled");
    $("#prevCanvas").attr("onclick", "");
    $("#nextCanvas").attr("onclick", "");
    $("#imgTop").addClass("fixingParsing");
    var topImg = $("#imgTop img");

    $("#tools").children("[id$='Split']").hide();
    $("#parsingSplit")
    .css({
        "display": "inline-block",
        //"height": window.innerHeight + "px"
    })
    .fadeIn();

    topImg.css({
        "top":"0px",
        "left":"0px",
        "overflow":"auto"
    });
    $("#imgTop .lineColIndicatorArea").css({
        "top":"0px",
        "left":"0px",
        "height":newCanvasHeight+"px"
    });

    $("#transWorkspace,#imgBottom").hide();
    $("#noLineWarning").hide();
    //window.setTimeout(function(){
    $("#imgTop img").css("width", "auto");
    $("#imgTop img").css("top", "0px");
    $("#transcriptionTemplate").css("width", "auto"); //fits canvas to image. $("#imgTop img").width() + "px".  Do we need a background color?
    $("#transcriptionCanvas").css("display", "block");
    //}, 500);
    //window.setTimeout(function(){
        //in here we can control what interface loads up.  writeLines
        //draws lines onto the new full size transcription image.
    $('.lineColIndicatorArea').hide();
     $(".centerInterface").fadeIn(600);
    //writeLines($("#imgTop img"));
    //}, 1200);

}

/* 
     * The ctrl+alt functionality so the user can drag an image around.  
     * */
    function toggleMoveImage(event) {
        //if (event && event.altKey && (event.ctrlKey || event.metaKey)) {
        if(!toggleMove){
            $(document).unbind("mousemove");
            $(document).unbind("mouseup");
            $(".lineColIndicatorArea").hide();
            fullTopImage();
            toggleMove = true;
            $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").addClass('noTransition');
            //$("#imgTop, #imgBottom").css("cursor", "url(images/open_grab.png),auto");
            //$(dragHelper).appendTo("body");
            startMoveImg();
    //        $("#imgTop, #imgBottom")
    //        .mousedown() //This will handle the mouse up
        }   
        //}
        if(event === false){
            $("#imgTop, #imgBottom").unbind("mousedown");
            $("#imgTop, #imgBottom").unbind("mousemove"); //This is what we needed from the mousup event
            $("#imgTop, #imgBottom").unbind("mouseup"); //This is what we needed from the mousup event
            $(document).unbind("mousedown");
            $(document).unbind("mousemove"); //This is what we needed from the mousup event
            $(document).unbind("mouseup"); //This is what we needed from the mousup event
            isMoving = false; //This is what we needed from the mouseup event.
            toggleMove = false;
            $("#moveImage").removeClass("selected");
            $(".transcriptlet").removeClass("moveImage");
            $(".transcriptlet").children("textarea").removeAttr("disabled");
            $("#imgTop, #imgBottom").css("cursor", "default");
            $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark, #imgTop, #imgBottom").removeClass('noTransition');
            fullPage(false, false);
            updatePresentation(focusItem[1]);
            $(".lineColIndicatorArea").show();
            
        }
    };
    
        /**
     * Hides ruler within parsing tool. Called on mouseleave .parsing.
     */
    function removeRuler(line){
        if(!isAddingLines){$(".deletable").removeClass('deletable mergeable');}
        //line.unbind('mousemove');
        $('#imageTip').hide();
        $('#ruler1').hide();
        $('#ruler2').hide();
    }
    
    //Triggered when a user alters a line to either create a new one or destroy one.
    function lineChange(e,event,deleteOnly){
        $("#parsingCover").show();
        if(isAddingLines){
            splitLine(e,event);
        }
        else{
            //merge the line you clicked with the line below.  Delete the line below and grow this line by that lines height.
            removeLine(e, false, deleteOnly);
        }

    }
    
    //Turn the ruler on
    function applyRuler(line, deleteOnly){
            if(!isAddingLines){
                if(deleteOnly){ //delete line
                    $("#imageTip").html("Remove Last Line");
                    if (line.attr("lineleft") !== line.next("div").attr("lineleft")) {
                        line.addClass('deletable');
                        //only let the deleted line get this cursor when deleting
                        line.css('cursor','pointer');
                    }
                    else{
                        //other lines get the "can't do it" cursor
                        line.css("cursor", "not-allowed");
                    }
                    
                }
                else{ //merge
                    if (line.attr("lineleft") == line.next("div").attr("lineleft")) {
                        line.next("div").addClass('deletable');
                    }
                    line.addClass('deletable');
                    if($(".deletable").size()>1){
                        $(".deletable").addClass("mergeable");
                        $("#imageTip").html("Merge Line");
                    } 
                    else  {
                        $("#imageTip").html("Remove Last Line");
                    }
                    //line.css('cursor','pointer'); //all the lines should get this cursor when merging
                    line.css('cursor','cell'); //all the lines should get this cursor when merging
                }
                $('#ruler1').hide();
            }
            else{ //add lines
                $("#imageTip").html("Add a Line");
                line.css('cursor','crosshair');
                $('#ruler1').show();
            }
            line.bind('mousemove', function(e){
                var imgTopOffset = $("#imgTop").offset().left; //helps because we can center the interface with this and it will still work.
                var myLeft = line.position().left + imgTopOffset;
                var myWidth = line.width();
                $('#imageTip').show().css({
                    left:e.pageX,
                    top:e.pageY+20
                });
                $('#ruler1').css({
                    left: myLeft,
                    top: e.pageY, 
                    height:'1px',
                    width:myWidth 
                });

            });
    }
    
        //Make sure the value entered into the area that allows a user to define a custom ruler color is a valida color string.  
    function validTextColour(stringToTest) {
        //Alter the following conditions according to your need.
        if (stringToTest === "") { return false; }
        if (stringToTest === "inherit") { return false; }
        if (stringToTest === "transparent") { return true; }

        var image = document.createElement("img");
        image.style.color = "rgb(0, 0, 0)";
        image.style.color = stringToTest;
        if (image.style.color !== "rgb(0, 0, 0)") { return true; }
        image.style.color = "rgb(255, 255, 255)";
        image.style.color = stringToTest;
        return image.style.color !== "rgb(255, 255, 255)";
    }
    
    //Change the ruler color.
    function rulerColor(color){
        if(color==="custom"){
            color=$("#customRuler").val();
            if(validTextColor(color)){
                
            }
            else{
                color = "red";
            }
            
        }
        $("#ruler1").css("color", color).css("background", color);
        $("#ruler2").css("color", color).css("background", color);
        $("#sampleRuler").css("color", color).css("background", color);
    }
    
        /* Toggle grayscale and invert image CSS filters.v   */
    function toggleFilter(which){
        /*
         * The grayscale/invert toggle classes CANNOT BE DEFINED as the same object being given the brightness/contrast filters or they ALL BREAK
         */
        var filterObjectTop = document.getElementsByClassName("transcriptionImage")[0];
        var filterObjectBottom = document.getElementsByClassName("transcriptionImage")[1];
        var thisFilter = which+"Filter";
        if(filterObjectTop.className.indexOf(thisFilter) >= 0){
          filterObjectTop.className = filterObjectTop.className.replace(thisFilter, '');
          filterObjectBottom.className = filterObjectBottom.className.replace(thisFilter, '');
          $("button[which='"+which+"']").removeClass("selected");
        }
        else{
          filterObjectTop.className = filterObjectTop.className+=" "+thisFilter;
          filterObjectBottom.className = filterObjectBottom.className+=" "+thisFilter;
          $("button[which='"+which+"']").addClass("selected");
        }
    }
    
    /*
     * Get the inline 'style' attribute of the transcription image containers and attach brightness or contrast filters to it.
     * The entire function is string manipulation and runs quickly.  
     */
    function imageSlider(){
        var newFilter = "";
        if(navigator.userAgent.indexOf("Chrome") !== -1 ) { //also works with filter
          //newFilter = "-webkit-filter:";
          newFilter = "filter:";
        } 
        else if(navigator.userAgent.indexOf("Opera") !== -1 ) {
          newFilter = "-o-filter:";
        }
        else if(navigator.userAgent.indexOf("MSIE") !== -1 ) { //also works with filter
          newFilter= "-ms-filter:";
        } 
        else if(navigator.userAgent.indexOf("Firefox") !== -1 ) { //-moz-filter does not work in more recent versions.  The newest version works with regular filter. 
          newFilter = "filter:";
        } 
        else {
            //Uncomment this code to alert the user that their browser does not support these CSS3 Filter tools.
            
//          alert("This tool is not supported by your browser.  The supported browsers are:\n\n\
//                Google Chrome\n Microsoft Internet Explorer\nOpera\nLatest version of Firefox");
//          return false;
        }
        var imgTop = document.getElementById("imgTop");
        var imgBtm = document.getElementById("imgBottom");
        var currentStyleTop = imgTop.getAttribute("style");
        var currentStyleBtm = imgBtm.getAttribute("style"); //null if there is no inline style (this happens)
        if (currentStyleTop === "null" || currentStyleTop === null) currentStyleTop = ""; //in case there is no inline style becase that returns null
        if (currentStyleBtm === "null" || currentStyleBtm === null) currentStyleBtm = ""; //in case there is no inline style because that returns null
        var alteredStyleTop = "";
        var alteredStyleBottom = "";
        var pieceToRemoveTop = "";
        var pieceToRemoveBtm = "";
        //Account for the different ways filter can be represented and alter it accordingly
        if(currentStyleTop.indexOf("-webkit-filter") >= 0){ //Chrome
          //Remove current filter string from the style attribute
          pieceToRemoveTop = currentStyleTop.substring(currentStyleTop.indexOf("-webkit-filter"), currentStyleTop.lastIndexOf(";") + 1);
          pieceToRemoveBtm = currentStyleBtm.substring(currentStyleBtm.indexOf("-webkit-filter"), currentStyleBtm.lastIndexOf(";") + 1);

          //Put the pieces of the filter together
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop.replace(pieceToRemoveTop, "") + newFilter;
          alteredStyleBottom = currentStyleBtm.replace(pieceToRemoveBtm, "") + newFilter;
        }
        else if(currentStyleTop.indexOf("-ms-filter") >= 0){ //microsoft browsers
          pieceToRemoveTop = currentStyleTop.substring(currentStyleTop.indexOf("-ms-filter"), currentStyleTop.lastIndexOf(";") + 1);
          pieceToRemoveBtm = currentStyleBtm.substring(currentStyleBtm.indexOf("-ms-filter"), currentStyleBtm.lastIndexOf(";") + 1);
          //Put the pieces of the filter together
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop.replace(pieceToRemoveTop, "") + newFilter;
          alteredStyleBottom = currentStyleBtm.replace(pieceToRemoveBtm, "") + newFilter;
        }
        else if(currentStyleTop.indexOf("-o-filter") >= 0){ //Opera
          //Remove current filter string from the style attribute
          pieceToRemoveTop = currentStyleTop.substring(currentStyleTop.indexOf("-o-filter"), currentStyleTop.lastIndexOf(";") + 1);
          pieceToRemoveBtm = currentStyleBtm.substring(currentStyleBtm.indexOf("-o-filter"), currentStyleBtm.lastIndexOf(";") + 1);
          //Put the pieces of the filter together
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop.replace(pieceToRemoveTop, "") + newFilter;
          alteredStyleBottom = currentStyleBtm.replace(pieceToRemoveBtm, "") + newFilter;
        }
        else if(currentStyleTop.indexOf("filter") >= 0){ //Works with firefox, IE and Chrome, but we specifically set prefixes at the beginning of the function.
          //Remove current filter string from the style attribute
          pieceToRemoveTop = currentStyleTop.substring(currentStyleTop.indexOf("filter"), currentStyleTop.lastIndexOf(";") + 1);
          pieceToRemoveBtm = currentStyleBtm.substring(currentStyleBtm.indexOf("filter"), currentStyleBtm.lastIndexOf(";") + 1);
          //Put the pieces of the filter together
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop.replace(pieceToRemoveTop, "") + newFilter;
          alteredStyleBottom = currentStyleBtm.replace(pieceToRemoveBtm, "") + newFilter;
        }
        else{ //First time the filter is being added.  The prefix is already a part of newFilter, so we just need to add the rest of the string.
          newFilter += " brightness("+$("#brightnessSlider").slider("value")+"%) contrast("+$("#contrastSlider").slider("value")+"%);";
          alteredStyleTop = currentStyleTop + " "+newFilter; 
          alteredStyleBottom = currentStyleBtm +" "+newFilter;
        }
        imgTop.setAttribute("style",alteredStyleTop); //set the style attribute with the appropriate filter string attached to it. 
        imgBtm.setAttribute("style",alteredStyleBottom); //set the style attribute with the appropriate filter string attached to it. 
    }
    
        
    /**
     * @@description Rewritten in newberry.js
     * @return {undefined}
     */
    function scrollToCurrentPage(){
        var pageOffset = $(".previewPage").filter(":first").height() + 20;
        $("#previewDiv").animate({
            scrollTop:pageOffset
        },500);
        $("#previewNotes").filter(".ui-state-active").each( // pulled out #previewAnnotations
            function(){
                if ($("."+this.id).is(":hidden")){
                    $("."+this.id).show();
                    scrollToCurrentPage();
                }
            });
    }
    
        /**
     * UI effects for when a user decides to edit a line within the preview split tool.
     * @@deprecated Not supported in this verion.
     * @param {type} line
     * @return {undefined}
     */
    function edit(line){
        var focusLineID = $(line).siblings(".previewLineNumber").attr("lineserverid");
        //var focusFolio = $(line).parent(".previewPage").attr("data-pagenumber");
        var transcriptionText = ($(line).hasClass("previewText")) ? ".theText" : ".notes";
        var pair = $(".transcriptlet[lineserverid='"+focusLineID+"']").find(transcriptionText);
        var transcriptlet = $(".transcriptlet[lineserverid='"+focusLineID+"']");
        if ($(line).hasClass("currentPage")){
          if (pair.parent().attr('id') !== focusItem[1].attr('id')){ 
              updatePresentation(transcriptlet);
          }
            line.focus();
            $(line).keyup(function(){
                //Data.makeUnsaved();
                pair.val($(this).text());
            });
        } 
        else {
            //console.log("NOt the current page.")
        }
    }
    
        /* Allows users to slightly adjust a line within a column while within the transcription interface. */
    function bumpLine(direction, activeLine){
        //values are in pixel, not percentage.
        var id = activeLine.attr("lineserverid");
        if(direction === "left"){
            var currentLineLeft = activeLine.css("left");
            var currentLineLeftPerc = (parseFloat(currentLineLeft) / $("#imgTop").width()) * 100;
            if (currentLineLeftPerc > .3){
                currentLineLeftPerc -= .3;
            }   
            else{ //no negative left value
                currentLineLeftPerc = 0.0;
            }
           currentLineLeft = "%"+currentLineLeftPerc;
        }
        else if (direction === "right"){
            var currentLineLeft = activeLine.css("left");
            var currentLineLeftPerc = (parseFloat(currentLineLeft) / $("#imgTop").width()) * 100;
            //console.log(currentLineLeftPerc);
            if (currentLineLeftPerc < 99.7){ //no left values greater than 100
                currentLineLeftPerc += .3;
            }   
            else{
                currentLineLeftPerc = 100.0;
            }
           currentLineLeft = "%"+currentLineLeftPerc;
        }
        var currentLineLeftPX = parseFloat(currentLineLeftPerc/100) * $("#imgTop").width() + "px";
        $(".transcriptlet[lineserverid='"+id+"']").attr("lineleft", currentLineLeftPerc);
        activeLine.css("left", currentLineLeftPX);
        updateLine($(".transcriptlet[lineserverid='"+id+"']"), false, null);
       
    }
    
    
    
    function openHelpVideo(source){
        $("#helpVideoArea").show();
        $(".shadow_overlay").show();
        //$(".trexHead").show();
        $("#helpVideo").attr("src", source);
        
    }

    function closeHelpVideo(){
        //Need to stop the video?
        $("#helpVideoArea").hide();
        $(".shadow_overlay").hide();
        $("#helpVideo").attr("src", "");
        //$(".trexHead").hide();
    }
    
    /*
     * There are many links/buttons to send one off to pages in the paleography site. 
     * This function will set those based off of the URL detected, that way we don't have
     * to hard code links.
     */
    function setPaleographyLinks(){
        var devOrProd = document.location.host;
        // ex. transcribe-dev.library.utoronto.ca or transcribe.library.utoronto.ca
        var lang = document.location.pathname;
        // ex. /TPEN-NL/newberryTrans.html
        var parojectLink = "";
        if(devOrProd.indexOf("transcribe-dev.library") > -1){
            switch(lang){
                case "/TPEN-NL/newberryTrans.html":
                    homeLink = "https://centerfordigitalhumanities.github.io/Newberry-French-paleography/";
                break;
                case "/TPEN-NL/italianTranscription.html":
                    homeLink ="https://centerfordigitalhumanities.github.io/Newberry-Italian-paleography/";
                break;
                default:
                    homeLink = "https://centerfordigitalhumanities.github.io/Newberry-French-paleography/";
            }
        }
        else if(devOrProd.indexOf("transcribe.library") > -1){
            switch(lang){
                case "/TPEN-NL/newberryTrans.html":
                    homeLink = "https://centerfordigitalhumanities.github.io/Newberry-French-paleography/";
                break;
                case "/TPEN-NL/italianTranscription.html":
                    homeLink ="https://centerfordigitalhumanities.github.io/Newberry-Italian-paleography/";
                break;
                default:
                    homeLink = "https://centerfordigitalhumanities.github.io/Newberry-French-paleography/";
            }
        }
        else{
            //We are not in an environment we do not expect.  For now, let's just point to paleography dev.
            switch(lang){
                case "/TPEN-NL/newberryTrans.html":
                    homeLink = "https://centerfordigitalhumanities.github.io/Newberry-French-paleography/";
                break;
                case "/TPEN-NL/italianTranscription.html":
                    homeLink ="https://centerfordigitalhumanities.github.io/Newberry-Italian-paleography/";
                break;
                default:
                    homeLink = "https://centerfordigitalhumanities.github.io/Newberry-French-paleography/";
            }
        }
        setIframeLinks();
        $("#homeBtn").attr("href", homeLink);
        $("#projectsBtn").attr("href", "my_transcriptions.html");
        $("#helpContact").attr("href", "contact.html");
    }
    
    /*
     * For when the app detects the user is not logged in.
     */
    function redirectToPaleographyHome(){
        window.location.href = homeLink;
    }
    
    /*
     * Make the direct Iframe links when possible for background essays and partial transcriptions.
     * It will always default to the page that shows them all for malformed direct links.
     */
    function buildIframeDirectLink(pathPiece){
        var link = homeLink+pathPiece;
        return link;
    }
    
    /*
     * Loop over all split page iframes and prepare the links.
     */
    function setIframeLinks(){
        var iframe_collection = $("iframe[data_src]");
        for (var i=0; i<iframe_collection.length; i++){
            var iframe = $(iframe_collection[i]);
            var current_src = iframe.attr("data_src");
            iframe.attr("data_src", homeLink+current_src);
        }
    }
    
function populateEditableXML(xmlTags){
    xmlTags = JSON.parse(xmlTags); // make a array by </span?
    var tagsInOrder = [];
    for (var tag = 0; tag < xmlTags.length; tag++){ 
        var newTagBtn = xmlTags[tag];
        if(newTagBtn.tag!=="" && newTagBtn.tag!==" "){
             $(".xmlTags").append($("<li class='projectTag' title='("+newTagBtn.tag+")' position='"+newTagBtn.position+"' oncontextmenu='editxmlcnfrm("+newTagBtn.position+", event);'>"+newTagBtn.description+"\n\
                <span class='removechar' onclick=\"removetagcnfrm("+newTagBtn.position+");\">X</span></li>"));
        }
    }
//    $.each(tagsInOrder, function(){
//        var button2 = $(''+this);
//        $(".xmlTags").append(button2);
//    }); 
}
    
function populateEditableChars(specialCharacters){
    specialCharacters = JSON.parse(specialCharacters);
    var speCharactersInOrder = new Array(specialCharacters.length);
    for (var char = 0; char < specialCharacters.length; char++){
            var thisChar = specialCharacters[char];
            if(thisChar.key === undefined || thisChar.key === ""){

            }
            else{
                var keyVal = thisChar.key;
                var position2 = parseInt(thisChar.position);
                var newCharacter = $("<li position='"+position2+"' oncontextmenu='editcharcnfrm("+position2+", event);'  class='character'>&#"+keyVal+"; <span class='removechar' onclick='removecharcnfrm("+position2+");'>X</span></li>");
//                if(position2-1 >= 0 && (position2-1) < specialCharacters.length){
//                    speCharactersInOrder[position2-1] = newCharacter; 
//                }
                $(".specialCharacters").append(newCharacter);
            }

        }
//        $.each(speCharactersInOrder, function(){
//            var button1 = this;
//            $(".specialCharacters").append(button1);
//        });
    }
    
//function imageExists(image_url){
//    var http = new XMLHttpRequest();
//    http.open('HEAD', image_url, false);
//    http.send();
//    return http.status != 404;
//}

function lazyLoadLargerImage(url) {
    lazyURL = url;
    var largerImageURL = url.replace("height=2000", "height=3500").replace(/\/full\/.*?\//, '/full/3500,/');
    var tester=new Image();
    tester.onload=populateLargeImage;
    tester.onerror=populateDefaultImage;
    tester.src=largerImageURL;
}

function populateLargeImage(){
    var url_large = lazyURL.replace("height=2000", "height=3500").replace(/\/full\/.*?\//, '/full/3500,/');
    $('.transcriptionImage').attr('src', url_large);
    $("#fullPageImg").attr("src", url_large);
}

function populateDefaultImage(){
    var url_default = lazyURL.replace(/\/full\/.*?\//, '/full/2000,/');
    $('.transcriptionImage').attr('src', url_default);
    $("#fullPageImg").attr("src", url_default);
}

/*
 * Newberry Templates
 */
document.addEventListener("DOMContentLoaded",()=>{

/**
 * When we care less about readability, this could be minified a bit.
 * ["header","footer"].forEach(tag=>document.querySelector("body>"+tag)||document.body.prepend(document.createElement(tag)))
 * NL instanceof Map || document.body.append(document.createElement("script").setAttribute("src", /italian/i.test(document.title) ? "https://centerfordigitalhumanities.github.io/Newberry-Italian-paleography/www/script/templates.js" : "https://centerfordigitalhumanities.github.io/Newberry-French-paleography/www/script/templates.js"))
 */

    if (!window['imgTop']){ // prevent on transcription interfaces
      const h = document.querySelector("body>header")
      const f = document.querySelector("body>footer")
      if (h === null) {
        document.body.prepend(document.createElement("header"))
      }
      if (f === null) {
        document.body.append(document.createElement("footer"))
      }
      if (NL instanceof Map) {
        
        // French will be the generic, but if it matters, we'll add this in.
        const src= /italian/i.test(document.title) 
        ? "https://centerfordigitalhumanities.github.io/Newberry-Italian-paleography/www/script/templates.js"
        : "https://centerfordigitalhumanities.github.io/Newberry-French-paleography/www/script/templates.js"
        
        let templates = document.createElement("script")
        templates.setAttribute("src", src)
        document.body.append(templates)
      }
    }
  })