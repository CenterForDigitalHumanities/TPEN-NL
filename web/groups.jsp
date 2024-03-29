<%--  
    Document   : groups
    Created on : Aug 5, 2009, 12:17:39 PM
    Author     : jdeerin1
--%>

    <%@page import="java.util.Arrays"%>
        <%@page import="java.util.List"%>
            <%@page import="edu.slu.util.ServletUtils"%>
                <%@page import="user.User" import="user.Group"  contentType="text/html; charset=UTF-8"  pageEncoding="UTF-8"%>
                    <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
   "http://www.w3.org/TR/html4/loose.dtd">
                    <%
if (session.getAttribute("UID") == null) {
     %>
                        <%@ include file="loginCheck.jsp" %>
                            <%        
 } 
else {
%>
                                <html>

                                <head>
                                    <title>Group Management</title>
                                    <link rel="stylesheet" href="css/tpen.css" type="text/css" media="screen, projection">
                                    <link rel="stylesheet" href="css/print.css" type="text/css" media="print">
                                    <!--[if lt IE 8]><link rel="stylesheet" href="css/ie.css" type="text/css" media="screen, projection"><![endif]-->
                                    <link type="text/css" href="css/custom-theme/jQuery.css" rel="Stylesheet" />
                                    <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.js"></script>
                                    <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.js"></script>
                                    <script type="text/javascript" src="js/tpen.js"></script>
                                    <link rel="shortcut icon" type="image/x-icon" href="https://newberry.org/sites/all/themes/newberry2015/favicon.ico">
                                    <style type="text/css">
                                        #footer {
                                            width: 1010px;
                                            position: fixed;
                                            left: 0;
                                            right: 0;
                                            bottom: 0;
                                            margin: 0 auto;
                                        }
                                        
                                        #foot {
                                            background: url(images/footer.png) top left no-repeat;
                                            position: relative;
                                            padding: 50px 125px;
                                        }
                                        
                                        #button {
                                            text-decoration: none;
                                        }
                                        
                                        a.ui-icon-closethick:hover {
                                            background-image: url(css/custom-theme/images/ui-icons_cd0a0a_256x240.png);
                                        }
                                    </style>
                                    <script type="text/javascript">
                                        $(function() {
                                            $('.delete').hover(function() {
                                                    $(this).parent().addClass("strikeout");
                                                },
                                                function() {
                                                    $(this).parent().removeClass("strikeout");
                                                }
                                            );
                                            $('.promoteUser').click(function() {
                                                var name = $(this).parent('li').text();
                                                var nIn = name.indexOf('Remove');
                                                if (nIn > 3)
                                                    name = name.substring(0, nIn - 1);
                                                var cfrm = confirm('This action will grant ' + name +
                                                    ' complete access as a Group Leader .\n\nAre you sure?');
                                                return cfrm;
                                            });
                                            $('.demoteUser').click(function() {
                                                var name = $(this).parent('li').text();
                                                var nIn = name.indexOf('Remove');
                                                if (nIn > 3)
                                                    name = name.substring(0, nIn - 1);
                                                var cfrm = confirm('This action will restrict ' + name +
                                                    ' to access as a Contributor. \n\nAre you sure?');
                                                return cfrm;
                                            });
                                        });
                                    </script>
                                </head>

                                <body>
                                    <div id="wrapper">
                                        <div id="header">
                                            <p align="center" class="tagline">transcription for paleographical and editorial notation</p>
                                        </div>
                                        <div id="content">
                                            <h1>
                                                <script type="text/javascript">
                                                    document.write(document.title);
                                                </script>
                                            </h1>
                                            <div class="ui-tabs ui-widget ui-widget-content ui-corner-all" id="main">

                                                <%@ include file="loginCheck.jsp" %>

                                                    <%
                  uid = 0;
                  try {
                     uid = Integer.parseInt(uname);
                  } catch (Exception e) {
                     uid = 1;
                  }
                  user.User thisUser = new user.User(uid);
                  int UID = uid;
                  boolean isAdmin = thisUser.isAdmin();
                  if (request.getParameter("projectID") != null) {
                     //since we know the group they need, list the group's comments
                     String projParam = request.getParameter("projectID").trim();
                     int projectID = Integer.parseInt(projParam);
                     textdisplay.Project thisProject = new textdisplay.Project(projectID);
                     user.Group thisGroup = new user.Group(thisProject.getGroupID());
                     isAdmin = thisGroup.isAdmin(UID) || thisUser.isAdmin();
                     //Is someone being nosey?

                     try {
                        if (!thisGroup.isMember(UID)) {
                           String errorMessage = thisUser.getFname() + ", you are not a member of this group.";
               %>
                                                        <%@include file="WEB-INF/includes/errorBang.jspf" %>
                                                            <%
                                 return;
                              }
                           } catch (NumberFormatException e) {
                              out.print("<p class=\"error ui-state-error\"><span class=\"ui-icon ui-icon-alert left\"></span>There was a problem with the group you specified.</p>");
                              return;
                           }

                           //Was this a user removal request?
                           if (request.getParameter("usr") != null && request.getParameter("act") != null && request.getParameter("act").compareTo("rem") == 0) {

                              //Do they have permission to remove this person? That would be either isAdmin==true or current user=requested user
                              if (isAdmin || Integer.toString(UID).compareTo(request.getParameter("usr")) == 0) {
                                 thisGroup.remove(Integer.parseInt(request.getParameter("usr")));
                              }
                           }

                           //Was this a user promotion request?
                           if (request.getParameter("usr") != null && request.getParameter("act") != null && request.getParameter("act").compareTo("promote") == 0) {
                              //Do they have permission to promote this person? That would be either isAdmin==true or current user=group leader
                              if (isAdmin) {
                                 thisGroup.setUserRole(UID, Integer.parseInt(request.getParameter("usr")), Group.roles.Leader);
                              }
                           }
                           //BH edit allow user demotion for parsing editing control
                           if (request.getParameter("usr") != null && request.getParameter("act") != null && request.getParameter("act").compareTo("demote") == 0) {
                              //Do they have permission to demote this person?  Did they try to demote themselves? That would be either isAdmin==true or current user=group leader
                              if (isAdmin) {
                                  if(Integer.parseInt(request.getParameter("usr")) != UID){
                                      thisGroup.setUserRole(UID, Integer.parseInt(request.getParameter("usr")), Group.roles.Contributor);
                                  }
                                  else{
                                      //user tried to demote themselves.  
                                  }
                              }
                           }

                           //Was this a user add request?
                           if (request.getParameter("uname") != null) {
                              //The lovely bit is that since the requestor has no idea if the target already has an account with us, we have to check on that
                               if(thisGroup.isMember(request.getParameter("uname"))){
                                 out.print("This user is already a member of this group");
                               }
                               else if (!thisGroup.addMember(request.getParameter("uname"))) {
                                 out.print("Failed to add that person because they have never used TPEN!<br>");
                              }
                           }
                           out.print("<h2 class=\"ui-widget-header ui-helper-clearfix ui-corner-all\">Group: " + thisProject.getProjectName() + "</h2>");

                           //now list the users, and give the option of adding another
                           out.print("<h3>Existing group members</h3>");
                           User[] groupMembers = thisGroup.getMembers();
                           boolean isLeader = thisGroup.isAdmin(thisUser.getUID()) || thisUser.isAdmin();
                           out.print("<ol>");
                           
                           
                           for (int i = 0; i < groupMembers.length; i++) {
                               String leadershipString = "";
                              boolean isLeadership = thisGroup.isAdmin(groupMembers[i].getUID());
                              //Maybe add some helpful tooltips about how this controls who can see parsing? 
                               if(isLeadership){
                                   leadershipString="<span class='loud'>Group Leader</span>";
                               }
                                if (isLeader) {
                                    if(isLeadership){
                                        if(UID != groupMembers[i].getUID()){
                                            out.print("<li>"+leadershipString+"&nbsp;<a class='demoteUser' title='Demote this user to Contributor' href='groups.jsp?act=demote&projectID=" + projectID + "&usr=" + groupMembers[i].getUID() + "' ><span class='ui-icon ui-icon-flag'></span></a>&nbsp; " + groupMembers[i].getUname() + " </li>");
                                        }
                                        else{
                                            //User's can't demote themselves or be promoted, so just output their name
                                             out.print("<li> "+leadershipString+" &nbsp; "+ groupMembers[i].getUname() + "&nbsp; </li>");
                                        }
                                    }
                                    else{
                                        out.print("<li><a class='promoteUser' title='Promote this user to Group Leader' href='groups.jsp?act=promote&projectID=" + projectID + "&usr=" + groupMembers[i].getUID() + "' ><span class='ui-icon ui-icon-person'></span></a>&nbsp;" + groupMembers[i].getUname() + "&nbsp;&nbsp;<a class=\"delete\" href=\"groups.jsp?act=rem&projectID=" + projectID + "&usr=" + groupMembers[i].getUID() + "\">Remove member</a></li>");
                                    }
                                } 
                                else {
                                    out.print("<li> "+leadershipString+" &nbsp; "+ groupMembers[i].getUname() + "&nbsp; </li>");
                                }

                           }
                           out.print("</ol>");
                if (isAdmin) {
                   if (!(thisProject.containsUserUploadedManuscript() && (groupMembers.length > 4))) {
               %>
                                                                <h4>Add a new group member (must have a T&#8209;PEN account)</h4>
                                                                <form action="groups.jsp" method="POST">
                                                                    <label for="uname">Username </label><input id="uname" type="text" name="uname" />
                                                                    <input type="hidden" name="projectID" value="<%out.print(" " + projectID);%>"/>
                                                                    <input type="submit" />
                                                                </form>
                                                                <%} else {
                        out.print("<p>This project contains private images and is limited to 5 collaborators.</p>");
                     }
                  } else {
                     out.print("<p>Contact your Group Leader or an administrator to add or remove individuals from this project.</p>");
                  }
               } 
            else {
                if(isAdmin){
                    try {
                     if (request.getParameter("groupName") != null) {
                        String groupName = request.getParameter("groupName");
                        try (Connection conn = ServletUtils.getDBConnection()) {
                           Group newGroup = new Group(conn, groupName, UID);
                           out.print("Created group " + newGroup.getTitle() + "</a>");
                        } catch (SQLException ex) {
                           out.print("Error creating group " + groupName + "</a>");                           
                        }
                     }
               %>

                                                                    <%

                     //Create a user object for this person




                  } catch (Exception e) {
                     System.out.print("it is in 1\n");
                  }
                  
                  thisUser = new User(uid);
                  //Create a dropdown with all of the groups this person is currently a member of
                  user.Group[] thisUsersGroups = thisUser.getUserGroups();
                  if (thisUsersGroups.length > 0) {
                     out.print("<span>Work with an existing group</span><br>");
                     out.print("<form action=\"groups.jsp\"><select name=\"group\">");
                     for (int i = 0; i < thisUsersGroups.length; i++) {
                        out.print("<option value=\"" + Integer.toString(thisUsersGroups[i].getGroupID()) + "\">" + thisUsersGroups[i].getTitle() + "</option>");
                        /*commentSet cs=thisUsersGroups[i].getGroupComments();
                         while(cs.hasNext())
                         {
                         comment thisComment=cs.getNext();
                         out.print(thisComment.getText());

                         }
                         */

                     }
                    out.print("</select><input type=\"submit\" value=\"Open Group\"/></form>");
                 }
                 //Allow for the creation of a new group
               out.print("Create a new group");
               %>
                                                                        <form action="groups.jsp" method="POST">
                                                                            <input type="text" name="groupName" value="Group Name" />
                                                                            <input type="submit" value="Create Group" />
                                                                        </form>
                                                                        <%
                out.print("</select>");
                }
            }
        }%>
                                            </div>
                                            <a class="returnButton" href="project.jsp?selectTab=2<%if (request.getParameter(" projectID ") != null) {
              out.print("&projectID=" + request.getParameter(" projectID "));
           }%>">Return to Project Management</a>
                                        </div>
                                        <%@include file="WEB-INF/includes/projectTitle.jspf" %>
                                    </div>
                                </body>

                                </html>
