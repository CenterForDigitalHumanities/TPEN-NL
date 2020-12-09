<%-- 
    Document   : project
    Created on : Aug 6, 2009, 11:44:14 AM
    Author     : jdeerin1
--%>

<%@page import="net.sf.json.JSONObject"%>
<%@page import="net.sf.json.JSONArray"%>
<%@page import="org.apache.commons.lang.StringEscapeUtils"%>
<%@page import="org.owasp.esapi.ESAPI" %>
<%@page import="edu.slu.util.ServletUtils"%>
<%@page import="textdisplay.*"%>
<%@page import="utils.Tool"%>
<%@page import="utils.UserTool"%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">
<%
    if (session.getAttribute("UID") == null) {
%><%@ include file="loginCheck.jsp" %><%        } else {
    int UID = 0;
    user.User thisUser = null;
    if (session.getAttribute("UID") != null) {
        //UID = ServletUtils.getUID(request, response);
        UID = Integer.parseInt(session.getAttribute("UID").toString());
        thisUser = new user.User(UID);
    }
%>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Transcription Project Management</title>
        <link rel="stylesheet" href="css/tpen.css" type="text/css" media="screen, projection">
        <link rel="stylesheet" href="css/print.css" type="text/css" media="print">
        <!--[if lt IE 8]><link rel="stylesheet" href="css/ie.css" type="text/css" media="screen, projection"><![endif]-->
        <link type="text/css" href="css/custom-theme/jQuery.css" rel="Stylesheet" />
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js"></script>
        <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.js"></script> 
        <script src="js/manuscriptFilters.js" type="text/javascript"></script>
        <script src="js/tpen.js" type="text/javascript"></script>
        <link rel="shortcut icon" type="image/x-icon" href="favicon.ico">
        <style>
            #footer { width: 1010px; position: fixed;left:0;right:0; bottom:0;margin: 0 auto;}
            #foot { background: url(images/footer.png) top left no-repeat;position:relative;padding:50px 125px; }
            #button { text-decoration: none; }
        </style>
        <style type="text/css" >
            body,#wrapper {height: 100%;max-height: 100%;overflow: visible;}
            #project, #ms, #team, #options, #export { margin: 0; padding: 0;}
            #project li, #ms li, #team li, #options li,#export li {padding: 0.4em; padding-left: 1.5em; height: 100%;overflow: hidden; float:left; width:32%; position: relative;margin-right: 1%;}
            #project li ul,#ms li ul,#team li ul, #options li ul, #export li ul {padding: 0;margin: 0;}
            #project li ul li,#ms li ul li,#team li ul li, #options li ul li, #export li ul li {list-style:outside none;padding:0;width:100%;height:100%;}
            #project div.tall {position: absolute;right:0;width: 29%;}
            #project div.tall li {position: absolute;right:20px;height:48%;margin:0;width:100%;min-height: 120px;}
            #project div.tall li:last-child {bottom:-13px;min-height: 80px;}
            #projectList {max-height: 300px;overflow: auto;}
            #projectList li {margin: 0;}
            a.tpenButton,button.tpenButton {padding: 2px; margin:2px; display:block;text-align: center; text-decoration: none;min-width: 90px;min-height:16px;}
            .stretch {font-size: 0.8em !important;}
            .shrink {width: 3em !important;font-size: 0.8em !important;}
            .grow {width:7em !important;}
            .bold, span.bold input {font-weight: bold; border: none;}
            span.bold input {width: 60px; font-size: .8em;}
            .ui-icon-closethick:hover {background-image: url(css/custom-theme/images/ui-icons_cd0a0a_256x240.png);}
            .disabled { margin: 0 3px 3px 23px; padding: 0.4em; padding-left: 1.5em; font-size: 1.4em; height: 18px;width:650px;}
            #addToProject,#addingTools {position: fixed; top:25%; left:25%; width:50%; display: none;z-index: 501;}
            #addingTools {
                box-shadow: 0 0 0 2000px rgba(0,0,0,.4);
                padding: 10px;
            }
            #addToolCommit, #addToolPreview {
                display: block;
                float: left;
            }
            #addToolName, #addToolURL {
                display: block;
                width: 50%;
            }
            #addToolFrame{
                float: right;
                height: 350px;
                width: 50%;
                position: relative;}
            #addToProject:after {
                content: "";
                width: 100%;
                height: 100%;
                position: fixed;
                pointer-events:none;
                z-index: 500;
                box-shadow: 0 0 200px black inset;
                top: 0;
                left: 0;}
            #form {height: 425px; margin: 0 auto; width:515px;border-width: 1px; 
                   -webkit-box-shadow: -1px -1px 12px black;
                   -moz-box-shadow: -1px -1px 12px black;
                   box-shadow: -1px -1px 12px black;
            }
            .delete {position:absolute;top:6px;right:6px;}
            input.text {width:100%;}
            #logFilter a:not(#openNote) {width:46%;float:left;margin-left: 1%;}
            #closePopup:hover {color: crimson;cursor: pointer;}
            .label {text-align: right; margin-right: 10px;}
            #inviteFeedback span {display:block;}
            #currentSetting {font-weight: bold;}
            #currentSetting:before {content:'Currently set to: "';color:black;font-weight: normal;}
            #currentSetting:after {content:'"';color:black;font-weight: normal;}
            .loadingBook {background-position: center center !important;}
            #xmlImport,#xmlValidate,#linebreaking,#wordbreak,#inviteUser,#template {margin:-4px 5px 2px;background: url(images/linen.png);padding:6px 2px 2px;display:none;overflow: hidden;z-index: 1; border: 1px solid #A68329;
                                                                                    -moz-box-shadow: -1px -1px 2px black;
                                                                                    -webkit-box-shadow: -1px -1px 2px black; 
                                                                                    box-shadow:-1px -1px 2px black;}
            #xmlImportBtn,#xmlValidateBtn,#linebreakingBtn,#wordbreakBtn,#inviteUserBtn,#templateBtn {padding:2px;text-align: center;position: relative;z-index: 2;cursor: pointer;width:100%;-o-box-sizing:border-box;-webkit-box-sizing:border-box;-moz-box-sizing:-ms-border-box;box-sizing:border-box;}
            #template label {width: 100%;}
            #template textarea {height: 3em;max-width: 100%;}
            .format{padding:2px;text-align: center;position: relative;z-index: 2;cursor: pointer;}
            .formatDiv{margin:-4px 5px 2px;clear:left;background: url(images/linen.png);padding:6px 2px 2px;display:none;overflow: hidden;z-index: 1; border: 1px solid #A68329;
                       -moz-box-shadow: -1px -1px 2px black;
                       -webkit-box-shadow: -1px -1px 2px black; 
                       box-shadow:-1px -1px 2px black;}
            #pdfOptions {display:block;}
            #exportLinebreakString,#exportWordbreak{width: 40px;}
            #quickExport span.choices {width:32%;float:left;position:relative;padding:15px 0;margin-bottom: -4px;}
            #quickExport {position:relative;}
            #quickExport input[type=radio] {visibility:visible;position: absolute;}
            .xmlRemove {display: none;clear: left;}
            .xmlShow {clear:left;}
            #xmlTags {display:block;}
            #quickExport h4 {position: relative;margin-bottom: 0;}
            .xmlFormat span {display: block;float:left;clear:left;width:40%;max-height: 18px;overflow: hidden;}
            #pageRange select {max-width: 175px;position: absolute;left:110px;}
            #exportTags select {position: absolute;right: 90px;}
            #samplePreview {overflow: hidden;position: relative;}
            #samplePreview img {width: auto;height: auto; position: absolute;left:0;top:30px;}
            #samplePreview h3 {position:relative;z-index: 2;}
            #samplePreview img, #samplePreview h3 {cursor: -moz-zoom-in, move;}
            #export label {font-weight: normal;width:auto;margin:0; padding:0;line-height: 24px; float: none;} /* override defaults */
            #export h3 {margin-top: 1em;margin-bottom: 0;}
            #export button {padding:8px 4px;width:33%;margin:0px;height:50px;}
            .xmlDisclaimer {display:none;float: left;clear: left;}
            #exportAlert {display: none;width:100%;}
            .partnerListing {width:100%;padding:2px;}
            .partnerName {width:100%;font-size: 125%;font-family: serif;display: block;}
            .partnerDescription {width:100%;padding:3px;margin:2px;display: block;white-space: normal;}
            .partnerSelected {background: green;}
            #tpenSubmit,#disconnect {width:100%;margin-bottom: 1.25em;}
            #deleteConnection{display: none;}
            span + h4[id] {margin-top:1.25em;}
            .projectTools,.userTools {font-weight: normal;width: auto;padding: 0;clear: left;}
            #customHeader {margin: 1em;background-color: rgba(255,255,255,.5);padding: .5em;display: block;color: gray;border:thin solid gray;overflow: auto;text-overflow:ellipsis;max-height: 300px;font-size: smaller;}
            #projectOrdering {position: fixed !important;width:50% !important;right:auto !important;} /* battling weird Chrome bug */ 
            .metadataInfo{height: 235px;}
            #copyingNotice{
                position: relative;
                height: auto;
                width: auto;
                display: none;
            }
            .copyLoader{
                top: -15px;
                position: relative;
            }
            .copyLoader img{
                height: 100px;
                left: 48px;
                position: relative;
            }
            .videoLink{
                display: inline-block;
                position: relative;
                height: 25px;
                width: 25px;
                background-image: url(../TPEN/images/helppositive.png);
                background-size: contain;
                top: 0px;
            }
            .vInvert{
               display: inline-block;
                position: relative;
                height: 25px;
                width: 25px;
                background-image: url(../TPEN/images/helpinvert.png);
                background-size: contain;
                background-repeat: no-repeat;
                top: 0px;
            }
            .videoShare{
                width: 25px !important;
            }
            #helpVideoArea{
                top: 5%;
                height:  675px;
                position: absolute;
                width: 80%;
                min-width: 825px;
                left: 10%;
                display: none;
                z-index: 7;
            }
            .videoBtn{
                position: absolute;
                right: 9px;
                top: 9px;
            }
        </style>
        <%
            String projectAppend = "";
            Boolean isAdmin,isMember,permitOACr,permitOACw,permitExport,permitCopy,permitModify,permitAnnotation,permitButtons,permitParsing,permitMetadata,permitNotes,permitRead;
            isAdmin=isMember=permitOACr=permitOACw=permitExport=permitCopy=permitModify=permitAnnotation=permitButtons=permitParsing=permitMetadata=permitNotes=permitRead=false;
            int projectID = 0;
            if (request.getParameter("projectID") != null) {
                projectID = Integer.parseInt(request.getParameter("projectID"));
                projectAppend = "&projectID=" + projectID;
                Project thisProject = new Project(projectID);
                Group thisGroup = new Group(thisProject.getGroupID());
                isMember = thisGroup.isMember(UID);
                isAdmin = (thisUser.isAdmin() || thisGroup.isAdmin(UID));
                if(isAdmin){
                    isMember = isAdmin;
                }
                ProjectPermissions permit = new ProjectPermissions(projectID);
                permitOACr = permit.getAllow_OAC_read();
                permitOACw = permit.getAllow_OAC_write();
                permitExport = permit.getAllow_export();
                permitCopy = permit.getAllow_public_copy();
                permitModify = permit.getAllow_public_modify();
                permitAnnotation = permit.getAllow_public_modify_annotation();
                permitButtons = permit.getAllow_public_modify_buttons();
                permitParsing = permit.getAllow_public_modify_line_parsing();
                permitMetadata = permit.getAllow_public_modify_metadata();
                permitNotes = permit.getAllow_public_modify_notes();
                permitRead = permit.getAllow_public_read_transcription();
                Boolean permitManage = permitExport || permitCopy || permitRead || permitButtons || permitMetadata;
                if (!isMember && !permitManage) {
                String errorMessage = thisUser.getFname() + ", you are not a member of this project.";
            %><%@include file="WEB-INF/includes/errorBang.jspf" %><%
                return;
                }
            } else { // projectID is null
                if (request.getParameter("delete") != null) {
                    int projectNumToDelete = Integer.parseInt(request.getParameter("projDelete"));
                    textdisplay.Project todel = new textdisplay.Project(projectNumToDelete);
                    user.Group projectGroup = new user.Group(todel.getGroupID());
                    isMember = projectGroup.isMember(UID);
                    isAdmin = (thisUser.isAdmin() || projectGroup.isAdmin(UID));
                    if(isAdmin){
                        isMember = isAdmin;
                    }
                    if (isAdmin) {
                        todel.delete();
                        textdisplay.Project[] p = thisUser.getUserProjects();
                        if (p.length > 0) {
                            projectID = p[0].getProjectID();
                        }
                        %>
                        <script>
                            document.location = "project.jsp?projectID=<%out.print(projectID);%>";
                        </script>
                        <%                        
                    } else {
                        //couldnt delete, you arent the project creator. You can remove yourself from the group working on this project by visting ...
                         %>
                            <script>
                                alert("Could not Delete, NOT AN ADMIN");
                                document.location = "project.jsp?projectID=<%out.print(projectID);%>";
                            </script>
                        <%       
                    }
                } else {
                    textdisplay.Project[] p = thisUser.getUserProjects();
                    if (p.length > 0) {
                        projectID = p[0].getProjectID();
                    }
                    if (projectID > 0) {
                    %>
                    <script>
                        document.location = "project.jsp?projectID=<%out.print(projectID);%>";
                    </script>
                    <%                         
                    } else {
                        out.print("<div class=\"error\">No project specified!</div>");
                    }
                    return;
                }
            }
            textdisplay.Project thisProject = new textdisplay.Project(projectID);
            //have they invited a new user?
            if (request.getParameter("invite") != null) {
                int result = thisUser.invite(request.getParameter("uname"), request.getParameter("fname"), request.getParameter("lname"));
                if (result == 0) {
                    user.Group g = new user.Group(thisProject.getGroupID());
                    if (isAdmin) {

                        user.User newUser = new user.User(request.getParameter("uname"));
                        g.addMember(newUser.getUID());
        %><script>
            $(function() {$('#inviteFeedback').html('<span class=\"ui-state-highlight ui-corner-all\"><%out.print(request.getParameter("fname"));%> has been invited to the project. A notification has been sent to an administrator for activation.<span>');
            });
            //alert('User has been invited, but must be activated by an administrator. The administrator has been notified');
        </script>
        <%
        } else {
        %><script>
            $(function() {$('#inviteFeedback').html('<span class=\"ui-state-error ui-corner-all\"><%out.print(request.getParameter("fname"));%> has been invited to TPEN, but only the project leader may add someone to a project. A notification has been sent to an administrator for activation.<span>');
                $('#inviteFeedback').effect('pulsate',500);
            });
            //alert('User has been invited to use TPEN, but the project leader must invite them to join the project. Also, the account must be activated by an administrator. The administrator has been notified');
        </script>
        <%
                }

            }
            if (result == 1) {
                //failed to create new user account! Likely because it already exists
%>
        <script>
            $(function() {$('#inviteFeedback').html('<span class=\"ui-state-error ui-corner-all\"><%out.print(request.getParameter("fname"));%> seems to have an account already, please use the "Add to Project" option to include them on your team. If you have any further trouble, please contact TPEN.<span>');
                $('#inviteFeedback').effect('pulsate',500);
            });
            //alert('Failed to invite new user, likely because they are already using TPEN!');
        </script>
        <%
            }
            if (result == 2) {
                //account created but email issue occured, usually happens in dev environments with no email server.
                user.Group g = new user.Group(thisProject.getGroupID());
                if (isAdmin) {

                    user.User newUser = new user.User(request.getParameter("uname"));
                    g.addMember(newUser.getUID());
        %><script>
            $(function() {$('#inviteFeedback').html('<span class=\"ui-state-error ui-corner-all\"><%out.print(request.getParameter("fname"));%> was successfully invited, but an e-mail error occurred. Please contact TPEN.<span>');
                $('#inviteFeedback').effect('pulsate',500);
            });
            //alert('The user invitation was successful, but a possible email error occured. Please contact the TPEN team.');
        </script>
        <%
        } else {
        %><script>
            $(function() { $('#inviteFeedback').html('<span class=\"ui-state-error ui-corner-all\"><%out.print(request.getParameter("fname"));%> was successfully invited, but an e-mail error occurred. Please contact TPEN. To add <%out.print(request.getParameter("fname"));%> to this project, the request must be made by the project leader.<span>');
                $('#inviteFeedback').effect('pulsate',500);
            });
            //alert('The user invitation was successful, but a possible email error occured. Please contact the TPEN team. Also, your project leader will need to invite them to join the project');
        </script>
        <%
                    }
                }
            }
        %>
        <script type="text/javascript">
            var minWidth = 10;
            function equalWidth(){
                $("#allXML").children("span").each(function(){
                    minWidth = ($(this).width()>minWidth) ? $(this).width() : minWidth;
                }).css({"min-width":minWidth+"px"});
            }
            var selecTab<%if (request.getParameter("selecTab") != null) {
                    out.print("=" + request.getParameter("selecTab"));
                }%>;
                    function deleteProject (user, project, title) {     //Confirm and delete project when user clicks x icon
                        var bDelete = confirm('This action will delete \"'+unescape(title)+'\" for all members. Are you sure?','Confirm Project Delete');
                        if(bDelete){
                            document.location = 'project.jsp?UID=' + user + '&delete=true&projDelete=' + project;
                        }
                    }
                    function simpleFormValidation (){
                        var field1=document.forms["invite"]["fname"].value;
                        var field2=document.forms["invite"]["lname"].value;
                        var field3=document.forms["invite"]["uname"].value;
                        if (field1==null || field1=="")
                        {
                            alert("First name must be filled out");
                            return false;
                        }
                        if (field2==null || field2=="" || field2.length<2)
                        {
                            alert("Last name must be filled out");
                            return false;
                        }
                        var atpos=field3.indexOf("@");
                        var dotpos=field3.lastIndexOf(".");
                        if (atpos<1 || dotpos<atpos+2 || dotpos+2>=field3.length)
                        {
                            alert("Not a valid e-mail address");
                            return false;
                        }
                    }
                    $(window).load(function(){
                        equalHeights("tall",100);
                        $("a:contains('Transcribe')").parent().each(function(){
                        $(this).removeClass('loadingBook').css("background","url('<%
                            int pageno = 501;
                            if (request.getParameter("delete") != null){
                                pageno = 0;
                            }
                            else{
                                try {
                                    if (request.getParameter("p") != null) {
                                        pageno = Integer.parseInt(request.getParameter("p"));
                                    } 
                                    else {
                                        pageno = thisProject.firstPage();
                                    }
                                    textdisplay.Folio thisFolio = new textdisplay.Folio(pageno, true);
                                    out.print(thisFolio.getImageURLResize(600));
                                } catch (ArrayIndexOutOfBoundsException e) {
                                    //Good luck
                                }
                            }
                            %>&quality=30') -30px -60px no-repeat"); 
                    });
                    
                                           
        });
        </script>
    </head>
    <body>
        <div id="wrapper">
            <div id="header"><p align="center" class="tagline">transcription for paleographical and editorial notation</p></div>
            <div id="content">
                <h1><script>document.write(document.title); </script></h1>
                <p>Use this page to coordinate your team, design customized projects from available manuscripts, and make fine adjustments to individual pages.</p>
                <div id="outer-barG">
                    <div id="front-barG" class="bar-animationG">
                        <div id="barG_1" class="bar-lineG">
                        </div>
                        <div id="barG_2" class="bar-lineG">
                        </div>
                        <div id="barG_3" class="bar-lineG">
                        </div>
                    </div>
                </div>
                <div id="tabs">
                    <a id="videoBtn_project" class="videoBtn" title="See help video!" onclick="openHelpVideo('http://www.youtube.com/embed/2ot-nGSZP2g');"><span class="vInvert"></span></a>
                    <ul>
                        <li><a title="Switch between projects or manage pages" href="#tabs-1">Projects</a></li>
                        <!--<li><a title="Alter linebreaks and parsings" href="#tabs-2">Manuscripts</a></li>-->
                        <%if(isAdmin){%>
                        <li><a title="Organize your team" href="#tabs-3">Collaboration</a></li>
                        <li><a title="Project Options" href="#tabs-4">Options</a></li>
                        <%}%>
                        <!--<li><a title="Export Options" href="#tabs-5">Export</a></li>-->
                    </ul>
                    <div id="tabs-1">
                        <ul id="project" class="ui-helper-reset">
                            <li class="ui-widget-content ui-corner-tr ui-corner-bl tall">
                                <h3>Project Selection</h3>
                                <%
                                user.Group thisGroup = new user.Group(thisProject.getGroupID());
                                User[] leader = thisGroup.getLeader();
                                if (!isMember){
                                %>
                                <p class="ui-state-highlight">You are viewing public project, <span class="loud bold"><%out.print(ESAPI.encoder().decodeFromURL(thisProject.getProjectName()));%></span>. To manage one of your own projects, click below.</p>
                                <%} else {%>
                                <p>
                                    Active project is &nbsp;<span class="loud"><%out.print(ESAPI.encoder().decodeFromURL(thisProject.getProjectName()));%></span>.<br>
                                    Active Project T&#8209;PEN I.D.&nbsp;&nbsp;<span class="loud"><%out.print((thisProject.getProjectID()));%></span>
                                </p>
                                <p> To manage a different project, select below. Clicking the X will delete your project.</p>
                                <%}%>
                                <h6>All Projects</h6>
                                <% if (session.getAttribute("UID") != null) {
                                        int puid;
                                        String puname = "" + session.getAttribute("UID").toString();
                                        try {
                                            puid = Integer.parseInt(puname);
                                        } catch (Exception e) {
                                            puid = 1;
                                        }
                                        if (puid > 1) {
                                            textdisplay.Project[] userProjects = thisUser.getUserProjects();
                                            if (userProjects.length > 0) {
                                            %><%@include file="WEB-INF/includes/projectPriority.jspf" %><%
                                                out.print("<ul id='projectList'>");
                                            }
                                            for (int i = 0; i < userProjects.length; i++) {
                                                textdisplay.Metadata mList = userProjects[i].getMetadata();
                                                out.print("<li><a title=\"" + userProjects[i].getProjectName() + "\" class=\"tpenButton projectTitle\" href=\"project.jsp?projectID=" + userProjects[i].getProjectID() + "\">" + ESAPI.encoder().decodeFromURL(mList.getTitle()) + "</a>");
                                                //  Get project Leader and offer a delete option.
                                                textdisplay.Project iProject = new textdisplay.Project(userProjects[i].getProjectID());
                                                user.Group projectGroup = new user.Group(iProject.getGroupID());
                                                if (isAdmin) {
                                                    out.print("<span class=\"delete ui-icon ui-icon-closethick right\" onclick=\"deleteProject(" + UID + "," + userProjects[i].getProjectID() + "," + "'" + StringEscapeUtils.escapeJavaScript(mList.getTitle()) + "'" + ");\">delete</span></li>");
                                                } else {
                                                    out.print("</li>");
                                                }
                                            }
                                            out.print("</ul>");
                                        }
                                    } else {
                                        out.print("<p>You have no active projects.</p>");
                                    }
                                    Metadata m = new Metadata(projectID);
                                if (permitModify || isMember){
                                %>
                                <!--<h3>Add to Project</h3>
                                <a id="addManuscript" class="tpenButton" href="#"><span class="ui-icon ui-icon-plus right"></span>Find Manuscript to Add</a>-->
                                <%}%>
                            </li>
                            <li class="left ui-widget-content ui-corner-tr ui-corner-bl tall">
                                <h3>Current Metadata Summary</h3>
<%
                                if (thisProject.getHeader().length()>0){
                                    String header = thisProject.getHeader();
                                    if(permitMetadata || isMember){%>
                                    <a class="tpenButton ui-button" href="projectMetadata.jsp?resetHeader=true&projectID=<%out.print(projectID);%>" id="emptyHeader">Remove Custom Header</a>
                                    <p>You have uploaded a custom header for this project, which is displayed below. This header is read-only. To change it, remove the current header and upload a new file.</p>
                                    <%}
                                    out.println("<span id='customHeader'>"+header+"</span>");
                                    if (header.length()>thisProject.getLinebreakCharacterLimit()-1){
                                        out.print("<span class='ui-state-error-text'>Preview limited to first "+thisProject.getLinebreakCharacterLimit()+" characters.</span>");
                                    }
                                } else {
%>
                                <p class="metadataInfo">
                                    <span class="label">Title: </span><%out.print(m.getTitle());%><br />
                                    <span class="label">Subtitle: </span><%out.print(m.getSubtitle());%><br />
                                    <span class="label">MS&nbsp;Identifier: </span><%out.print(m.getMsIdentifier());%><br />
                                    <span class="label">MS&nbsp;Settlement: </span><%out.print(m.getMsSettlement());%><br />
                                    <span class="label">MS&nbsp;Repository: </span><%out.print(m.getMsRepository());%><br />
                                    <span class="label">MS&nbsp;Collection: </span><%out.print(m.getMsCollection());%><br />
                                    <span class="label">MS&nbsp;ID&nbsp;number: </span><%out.print(m.getMsIdNumber());%><br />
                                    <span class="label">Group&nbsp;Leader: </span><%
                                        for (int i = 0; i < leader.length; i++) {
                                            if (i > 0) {
                                                out.print(", ");
                                            }
                                            out.print(leader[i].getFname() + " " + leader[i].getLname());
                                        }%><br />
                                    <span class="label">Subject: </span><%out.print(m.getSubject());%>
                                    <span class="label">Author: </span><%out.print(m.getAuthor());%>
                                    <span class="label">Date: </span><%out.print(m.getDate());%>
                                    <span class="label">Location: </span><%out.print(m.getLocation());%>
                                    <span class="label">Language: </span><%out.print(m.getLanguage());%>
                                </p>
                                <%if(permitMetadata || isMember){%>
                                <p>To update any of this information:</p>
                               
                                <a class="tpenButton" href="projectMetadata.jsp?projectID=<%out.print("" + projectID);%>"><span class="ui-icon ui-icon-tag right"></span>Update Metadata</a>
<%}}%>                             </li> 
                            <div class="tall">
                                <li class="left ui-widget-content ui-corner-tr ui-corner-bl loadingBook">
                                <%
                                int recentFolio = thisProject.getLastModifiedFolio();
                                String projectLink = (recentFolio>0) ? 
                                    "<a class='tpenButton' href='newberryTrans.html?projectID=" + projectID + "&p=" + recentFolio + "'><span class='ui-icon ui-icon-pencil right'></span>Resume Transcribing</a>": 
                                    "<a class='tpenButton' href='newberryTrans.html?projectID=" + projectID + "'><span class='ui-icon ui-icon-pencil right'></span>First Page</a>"; 
                                if(permitRead || permitModify || permitNotes || isMember){%>
                                    <%out.print(projectLink);%>
                                    <select class="clear folioDropdown" style="margin: 10% 10%;text-align: center;max-width: 80%;" onchange="navigateTo(this);">
                                        <option SELECTED>Jump to page</option>
                                    </select>
                                    <%}%>
                                </li>
                                <%if(permitModify || isMember){%>
                                <li class="left ui-widget-content ui-corner-tr ui-corner-bl"><a class="tpenButton" href="projSequence.jsp?projectID=<%out.print("" + projectID);%>"><span class="ui-icon ui-icon-image right"></span>Modify image sequence</a>
                                    <p>Change the order of or remove pages within this project.</p></li>
                                    <%}%>
                            </div>
                        </ul>
                    </div>
<!--                    <div id="tabs-2">
                        <ul id="ms" class="ui-helper-reset">
                            <li class="left ui-widget-content ui-corner-tr ui-corner-bl tall loadingBook">
                                <%if(permitRead || permitModify || permitNotes || isMember){%>
                                    <%out.print(projectLink);%>
                                    <select class="clear folioDropdown" style="margin: 10% 10%;text-align: center;max-width: 80%;" onchange="navigateTo(this);">
                                        <option SELECTED>Jump to page</option>
                                    </select>
                                                              <%}%>
  </li>
                                <%if(permitModify || isMember){%>
                            <li class="left ui-widget-content ui-corner-tr ui-corner-bl tall">
                                <a class="tpenButton" href="newberryTrans.html?tool=linebreak&projectID=<%out.print("" + projectID);%>"><span class="ui-icon ui-icon-clipboard right"></span>Linebreak and proofread existing text</a>
                                <p>Adjust the linebreaking or make changes to uploaded text. Also revise previously saved transcriptions.</p>
                                <a class="tpenButton" href="uploadText.jsp?projectID=<%out.print("" + projectID);%>"><span class="ui-icon ui-icon-folder-open right"></span>Upload a file to linebreak</a>
                                <p>Upload a file to get started. The text will be available to any group member in this project.</p>
                            </li>
                                                               <%}
                                    if(permitParsing || isMember){%>
 <li class="left ui-widget-content ui-corner-tr ui-corner-bl tall"><a class="tpenButton" href="newberryTrans.html?parsing=true&projectID=<%out.print("" + projectID);%>"><span class="ui-icon ui-icon-note right"></span>Check line parsings</a>
                                <p>Verify the automatic line detection for the project or define the columns and lines manually. Access independent control over each page in the project.</p>
                            </li>
<%}%>
                        </ul>
                    </div>-->
                    <%if(isAdmin){%>
                    <div id="tabs-3">
                        <ul id="team" class="ui-helper-reset">
                            <li class="left ui-widget-content ui-corner-tr ui-corner-bl tall">
                                <div id="inviteFeedback"></div>
                                <%
                                    User[] groupMembers = thisGroup.getMembers();
                                    User[] groupLeader = thisGroup.getLeader();
                                if (isAdmin && !thisProject.containsUserUploadedManuscript()){
                                %>
                                <a class="tpenButton" href="#publicOptions" onclick="$('#publicOptions').fadeIn('normal');return false;"><span class="ui-icon ui-icon-unlocked right"></span>Share Publicly</a>
                                <%}
                                if(isAdmin){%>
                                <a class="tpenButton" href="groups.jsp?projectID=<%out.print("" + projectID);%>"><span class="ui-icon ui-icon-person right"></span>Modify Project Team</a>
                                <p>Add, delete, or just check your group membership on this project.</p>
                                <%}
                                    out.print("<h4>" + thisGroup.getTitle() + " Group Members:</h4>");
                                    //now list the users
                                    if(isAdmin){
                                        for (int i = 0; i < groupMembers.length; i++) {
                                            if (groupLeader.length > 0 && groupLeader[0].getUID() == groupMembers[i].getUID()) {
                                                out.print("<div class='loud'>" + groupMembers[i].getFname().substring(0,1) +"&nbsp;"+groupMembers[i].getLname() + "&nbsp;(" + groupMembers[i].getUname() + ")&nbsp;Group&nbsp;Leader</div>");
                                            } else {
                                                out.print("<div>" + groupMembers[i].getFname().substring(0,1) +"&nbsp;"+groupMembers[i].getLname() + "&nbsp;(" + groupMembers[i].getUname() + ")</div>");
                                            }
                                        }
                                   }else{ // e-mail username hidden from non-members
                                        for (int i = 0; i < groupMembers.length; i++) {
                                            if (groupLeader.length > 0 && groupLeader[0].getUID() == groupMembers[i].getUID()) {
                                                out.print("<div class='loud'>" + groupMembers[i].getFname().substring(0,1) +"&nbsp;"+groupMembers[i].getLname()+",&nbsp;Group&nbsp;Leader</div>");
                                            } else {
                                                out.print("<div>" + groupMembers[i].getFname().substring(0,1) +"&nbsp;"+groupMembers[i].getLname() + "</div>");
                                            }
                                        }
                                    }
                                %>
                            </li>
                            <!-- BH note got rid of invite user and recent activity -->
                        </ul>
                    </div>
                    <%}%>
                    <div id="tabs-4">
                        <ul id="options" class="ui-helper-reset">
                            <li class="left ui-widget-content ui-corner-tr ui-corner-bl tall">
                                <h3>Project Options</h3>
                                <%if(isMember || permitModify){%>
                                Customize buttons
                                <!-- BH note got rid of Import project and validate stuff.  Can revive if we want -->
                                <%if (isAdmin){%>
                                <a class="tpenButton" href="buttons.jsp?projectID=<%out.print("" + projectID);%>"><span class="ui-icon ui-icon-gear right"></span>Button Management</a>
                                <p>The <span title="Any unicode character can be attached to one of these buttons for use in your project." class="loud">Special Character</span> and <span title="Multiple custom tags with parameters can be added to this project." class="loud">Custom xml Tags</span> you define will remain specific to each project. These buttons are accessible on the transcription pages. Characters assigned to the numbered buttons can be inserted simply by holding CTRL and pressing the corresponding number on the keyboard.</p>
                                <%} 
                                else{%>
                                    <p>Button management is restricted to group leaders and administrators.</p>
                                <%}
                            }
                            else {%>
                               <!--<p>Button management is restricted to group members on this public project. The current button pallete is displayed to the right.</p>-->
                           <%}
                           if ((isMember || permitCopy)){ //&& !thisProject.containsUserUploadedManuscript()
                           %>                     
                                <div class="hideWhileCopying">
                                    <a id="copyProjectBtn" class="tpenButton" proj="<%out.print(projectID);%>"><span class="ui-icon ui-icon-copy right"></span>Create an Empty Copy</a>
                                    <p>Create a new project with the same set of images and buttons.  This copy will not include any transcription data, just project data.
                                        Once copied, the projects will not synchronize cannot be recombined in T&#8209;PEN.</p><br>

                                    <a id="copyProjectAndAnnosBtn" class="tpenButton" proj="<%out.print(projectID);%>"><span class="ui-icon ui-icon-copy right"></span>Create a Copy</a>
                                    <p>Create a new project with the same set of images, transcriptions, and buttons. Once copied, the projects will not synchronize cannot be recombined in T&#8209;PEN.</p>
                                </div>
                            <%}%>
                                <div id="copyingNotice">
                                    <div class="copyMsg"> Please be patient while we copy the information into a new project.</div>
                                    <div class="copyLoader"><img src="images/loading2.gif" /></div>
                                </div>
                            </li>
                            <!-- bh NOTE Got rid of buttons preview here, can revive if we want. --> 
                        </ul>
                    </div>
                    <!-- BH note got rid of tabs-5 here, can revive if we want. -->
                </div>
                <a class="returnButton" href="index.jsp?projectID=<%out.print("" + projectID);%>">Return to TPEN Homepage</a>
            </div>
        </div>
            <!-- BH note got rid of add manuscript to project widget here. -->
        <!-- BH note got rid of public options here -->
    <!-- BH note got rid of add iframe tool widget here -->
        <%@include file="WEB-INF/includes/projectTitle.jspf" %>
        <script type="text/javascript">
        $(function() {
                $("#copyProjectBtn").click(function(){
                    var cfrm = confirm('All buttons and project information will be copied into a new project.\n\nContinue?');
                    if(cfrm){
                        var projID = $(this).attr("proj");
                        copyProject(projID, false);
                    }
                    return cfrm;
                });
                $("#copyProjectAndAnnosBtn").click(function(){
                    var cfrm = confirm('All transcriptions, parsings, and buttons will be copied into a new project.\n\nContinue?');
                    if(cfrm){
                        var projID = $(this).attr("proj");
                        copyProject(projID, true);
                    }
                    return cfrm;
                });
                $("#xmlSelectAll").click(function(){
                    if ($(this).attr('state') == "on"){
                        $(this).text("Select All").attr('state','off');
                        $("[name^='removeTag']").attr("checked",false);
                    } else {
                        $(this).text("Deselect All").attr('state','on');
                        $("[name^='removeTag']").attr("checked",true);
                    }
                });
                $("#export").find("button").hover(function(){$(this).toggleClass("ui-state-hover")});
                $( "#popupNote").click(function() {
                    $( "#noteForm" ).fadeIn(1000);
                    return false;
                });
                $( "#clearNote").click(function() {
                    $( "#noteForm" ).fadeOut(500);
                    return false;
                });
                $('#tabs').tabs({ 
                    fx: { opacity: 'toggle', duration:250 },
                    show: function(ui) {equalHeights("tall",100);equalWidth();}
                });
                if (selecTab) $('#tabs').tabs('option','selected',selecTab);
                $('span.delete').hover(
                function(){$(this).parent('li').find("a.tpenButton").addClass     ("ui-state-error strikeout");},
                function(){$(this).parent('li').find("a.tpenButton").removeClass  ("ui-state-error strikeout");}
            );
                $(".formatDiv").addClass('ui-corner-all');
                $(".format").click(function(){
                    $(this).next("div.formatDiv").slideToggle(500);
                });
                $("#addManuscript").click(function(){
                    $("#wrapper").append("<div class='ui-widget-overlay' id='overlay' style='display:none;'></div>");
                    $("div#addToProject,#overlay").show('fade',500);
                });
                $("#closePopup").click(function(){
                    $("div#addToProject,#overlay").hide('fade',500,function(){
                        $("#overlay").remove();
                    });
                });
                $("#xmlImportBtn,#inviteUserBtn,#templateBtn").click(function(){
                    $(this).toggleClass("ui-state-active")
                    .next("form").slideToggle(function(){
                        equalHeights("tall",200);
                    }); 
                });
                $("#xmlValidateBtn").click(function(){
                    $("#xmlValidate").slideToggle(function(){
                        equalHeights("tall",200);
                    }); 
                });
                $("#linebreakingBtn").click(function(){
                    $("#linebreaking").slideToggle(function(){
                        equalHeights("tall",200);
                    }); 
                });
                $("#wordbreakBtn").click(function(){
                    $("#wordbreak").slideToggle(function(){
                        equalHeights("tall",200);
                    }); 
                });
//                                        $("#logFilter a").not($("#openNote")).hide(); //delete this line to enable the filters on the projectLog
                $("#logFilter a").not($("#openNote")).click(function(){
                    $(this).toggleClass('ui-state-disabled');
                    $("#projectLog div."+$(this).attr("filter")).parent().parent().slideToggle();
                });
                /* Handlers for Export Options */
                $("#inline, #pageonly").click(function(){
                    if(this.checked) {
                        $("#exportAlert").slideDown();
                        $("#exportHyphenation").attr("disabled",false);
                    }
                    if($("#notesLine").attr("checked") || $("#notesSideBySide").attr("checked")){
                        $("#notesRemove").attr("checked", true);
                        //alert("Notes options were incompatable with this selection and have been changed.");
                    }
                    if(this.id=="inline") $("#notesFootnote").attr("disabled",true);
                    $("#notesSideBySide, #notesLine").attr("disabled",true);
                });
                $("#newline").click(function(){
                    if(this.checked) $("#exportHyphenation").attr("disabled",true);
                    $("#notesSideBySide, #notesLine, #notesFootnote").attr("disabled",false);
                });
                $("#notesSideBySide,#notesLine").click(function(){
                    if(this.checked) {
                        $("#exportAlert").slideDown();
                        $("#exportWordbreak, #pageonly, #inline").attr("disabled",true);
                        if($("#pageonly").attr('#checked')||$("#inline").attr('checked')) {
                            //alert('Linebreaking options were incompatable with your selection and have been changed.');
                        }
                        $("#newline").attr({'checked': true,'disabled':false});
                    }
                });
                $("#notesEndnote,#notesFootnote,#notesRemove").click(function(){
                    if(this.checked) {
                        $("#exportWordbreak, #newline, #exportLinebreakString, #useLinebreakString, #pageonly, #inline").attr("disabled",false);
                        $("#exportAlert").slideUp();
                    }
                });
                //                $("#metadataOption").click(function(){
                //                    if ($("#metadataSelect").is(":checked")) $("#metadataPreview").slideDown();
                //                    else $("#metadataPreview").slideUp();
                //                })
                $("#pdf,#rtf").click(function(){
                    if(this.checked) {
                        $(".xmlHide").show();
                        $(".xmlDisclaimer").hide();
                        $("#color").attr("disabled",false);
                    }
                });
                $("#xml").click(function(){
                    if(this.checked) {
                        var areChanges = false;
                        $(".xmlHide").hide();
                        $(".xmlDisclaimer").show();
                        $("#color").attr("disabled",true);
                        if ($("#color").attr("checked")){
                            areChanges = true;
                            $("#bw").attr("checked",true);
                        }
                        if ($("#notesSideBySide,#notesEndnote,#notesFootnote,#notesLine").attr("checked")) {
                            areChanges = true;
                            $("#notesRemove").attr("checked",true);
                        }
                        if ($("#pageonly,#newline").attr("checked")) {
                            areChanges = true;
                        }
                        $("#inline").attr("checked",true);
                        //if (areChanges) alert("Some selections are not supported in plaintext export and have been changed.");
                    }
                });
                $(".beginFolio,.endFolio").change(function(){
                    var thisIs = ($(this).hasClass('beginFolio')) ? "beginFolio" : "endFolio";
                    $('.'+thisIs).val(this.value);
                    var first = $(this).parent().find(".beginFolio");
                    var last = $(this).parent().find(".endFolio");
                    var firstFolio = first.children("option:selected").index();
                    var lastFolio = last.children("option:selected").index();
                    if (firstFolio > lastFolio) {
                        first.add(last).addClass("ui-state-error").attr("title","Folio range does not include any pages.");
                        $('#submitLimit').prop('disabled',true).addClass('ui-state-disabled');
                    } else {
                        first.add(last).removeClass("ui-state-error").attr("title","");
                        $('#submitLimit').prop('disabled',false)
                            .removeClass('ui-state-disabled')
                            .html("Submit Set Range");
                    }
                });
                $("#toolSelection").submit(function(){
                    $(this).find(".projectTools").each(function(){
                        var thisInput = $(this).find("input");
                        thisInput.val($(this).find("span").text()+"TPENTOOLURL"+thisInput.val());
                    });
                });
                $(".publicLabel").children('input').on('change',function(){$("#publicOptionResult").fadeOut('slow');});
                $("#samplePreview").hover(function(){
                        $(this).find("img").css({
                            "width" :   "auto",
                            "height":   "auto"
                        });
                        var posX = $(this).offset().left;
                        var posY = $(this).offset().top;
                        var sampleX = $(this).width();
                        var sampleY = $(this).height();
                        var imgX = $(this).find("img").width();
                        var imgY = $(this).find("img").height();
                        var imgLeft = 0;
                        var imgTop= 0;
                        $(document).bind('mousemove', function(e){
                            imgLeft = -(e.pageX-posX) * (imgX-sampleX-68) / sampleX;    // 68 pixel nudge for padding and box-model inconsistencies
                            imgTop  = -(e.pageY-posY) * (imgY-sampleY-30) / sampleY;    // 30 pixel nudge for padding and box-model inconsistencies
                            $("#samplePreview").find("img").css({
                                "left"  :   imgLeft,
                                "top"   :   imgTop
                            });
                        });
                    },function(){
                        $(this).find("img").css({
                            "width" :   "100%",
                            "height":   "100%",
                            "top"   :   "30px",
                            "left"  :   0
                        });
                        $(document).unbind('mousemove');
                    }).find("img").css({
                        "width" :   "100%",
                        "height":   "100%"
                    });
                });


                function toggleRTLOption(e){
                    var target = $(e.target);
                    if(target.is(":checked")){
                        $("input[value='xml']").removeAttr("checked").attr("disabled", "disabled");
                    }
                    else{
                        $("input[value='xml']").removeAttr("disabled");
                        if($("input[value='xml']").attr("track") == "checked"){
                            $("input[value='xml']").attr("checked", "checked");
                        }

                    }
                }
                function navigateTo(dropdown){
                    $("body").addClass(" ui-state-disabled");
                    document.location='newberryTrans.html?p='+dropdown.value;

                }
                function equalHeights (eClass, minHeight){
                    var minHeight = minHeight;
                    var tabIndex = $("#tabs").tabs().tabs('option','selected')+1;
                    $("#tabs-"+tabIndex).find("."+eClass).each(function(){
                        minHeight = ($(this).height()>minHeight) ? $(this).height() : minHeight; 
                    })
                    $("#tabs-"+tabIndex).find("."+eClass).css({"min-height":minHeight+"px"});
                }
                var selectWordbreak = "-";
                function customWordbreak(){
                    selectWordbreak = $('#userWord').val();
                    $("#currentSetting").html(selectWordbreak);
                }
                function scrubListings (){
                    $("#listings").ajaxStop(function(){
                        $("#listings a[href *= 'transcription']").hide();
                    });
                }
                function addTool() {
                    var name=$("#addToolName").val();
                    var URL=$("#addToolURL").val();
                    if(name.length<1){
                        $("#addToolName").addClass('ui-state-error').one('change',function(){$(this).removeClass('ui-state-error')});
                        return false;
                    }
                    if(URL.length<5){
                        $("#addToolURL").addClass('ui-state-error').one('change',function(){$(this).removeClass('ui-state-error')});
                        return false;
                    }
                    var newTool = ['<label class="projectTools"><input name="projectTool[]" type="checkbox" checked="true" value="',
                            URL,'" title="',name,'"><span contenteditable="true">',name,'</span></label>'].join('');
                        $(".projectTools").eq(0).before(newTool);
                    $("#addingTools").fadeOut();
                }
                function copyProject(projID, transData){
                    $(".hideWhileCopying").hide();
                    $("#copyingNotice").show();
                    var url = "copyProject";
                    var params = {"projectID":projID};
                    if(transData){
                       url += "AndTranscription";
                    }
                    else{
                       url += "DataOnly";
                    }
                    //Need to have a UI so the users knows a copy is taking place / completed / failed.
                    $.post(url, params, function(data){
                        $(".hideWhileCopying").show();
                        $("#copyingNotice").hide();
                        location.reload(); //This is to force pagination to get this project into the project list
                    });
                }
                function openHelpVideo(source){
                    $("#helpVideoArea").show();
                    $(".shadow_overlay").show();
                    $(".trexHead").show();
                    $("#helpVideo").attr("src", source);
                }

                function closeHelpVideo(){
                    //Need to stop the video?
                    $("#helpVideoArea").hide();
                    $(".shadow_overlay").hide();
                    $(".trexHead").hide();
                }
        </script>
        <div class="shadow_overlay"></div>
        <div id="helpVideoArea"  class="ui-widget ui-corner-all ui-widget-content">
            <div id="closeHelpVideo" onclick="closeHelpVideo();"> X </div>
            <h2 class="ui-widget-header ui-corner-all">Help Video Player</h2>
            <div style="text-align: center;">
                <iframe width="800" height="600" id="helpVideo" src="" frameborder="0" allowfullscreen> </iframe>                                                                                               
            </div>
        </div>
    </body>
    <%    //sent request to link schema
        if (request.getParameter("xmlImport") != null) {
           try (Connection conn = ServletUtils.getDBConnection()) {
               thisProject.setSchemaURL(conn, request.getParameter("url"));
    %>
    <script>
        $("#xmlImportDiv").prepend("<span class='ui-icon ui-icon-circle-check left'></span>XML successfully linked");
        $("#importBtnFromSchemaBtn, #xmlValidateDiv").show();
    </script>
    <%
           } catch (Exception ex) {
    %><script>$("#xmlImportDiv").prepend("<span class='ui-icon ui-icon-alert left'></span>Failed to import. Please check the link and try again. For more information on compatable file formats, check the wiki documentation.");$("#xmlImportDiv").addClass("ui-corner-all ui-state-error");</script><%                }
        }
    %>
</html>
<%}%>