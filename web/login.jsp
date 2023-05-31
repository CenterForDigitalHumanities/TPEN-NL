<%-- 
    Document   : login
    Created on : Apr 24, 2009, 8:52:50 AM
    Author     : jdeerin1
--%>
    <%@page import ="java.sql.*"%>
        <%@page import ="user.*"%>
            <%@page contentType="text/html; charset=UTF-8"  pageEncoding="UTF-8" %>
                <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
   "http://www.w3.org/TR/html4/loose.dtd">
                <%
   if(request.getParameter("uname")!=null&&request.getParameter("password")!=null)
       {
       user.User thisOne=new user.User(request.getParameter("uname"), request.getParameter("password"));
            if(thisOne.getUID()>0)
                { 
                session.setAttribute("UID", ""+thisOne.getUID());
                String ref="";
                String tmpref=request.getParameter("referer");
                if(request.getParameter("referer")==null || request.getParameter("referer").compareTo("")==0 || request.getParameter("referer").contains("login")){
                    %>
                    <script>
                        document.location = "my-transcriptions.html";
                    </script>
                    <%}
                //response.sendRedirect("index.jsp");
                else
                    {
                    if(request.getParameter("referer").contains("authenticate.jsp"))
                        {
                    %>
                        <script>
                            document.location = "login.jsp";
                        </script>
                        <%                       // response.sendRedirect("index.jsp");
                        }
                    else
                        {
                    %>
                            <script>
                                document.location = '<%out.print(request.getParameter("referer"));%>';
                            </script>
                            <%//                        response.sendRedirect(request.getParameter("referer"));
                        }
                    }
                }
            else{
                //check for user by this email address 
                thisOne=new user.User(request.getParameter("uname"));
                if(thisOne.getUID()>0){
                    //If there is a user with this email
                    if(thisOne.isOldDrupalUser()){
                        //They need a password reset!
                        response.sendRedirect("admin.jsp?resetSubmitted=true&email="+thisOne.getUname());
                        return;
                    }
                    else{
                        String errorMessage = "Incorrect log in. Try again or <a href='login.jsp'>Request an Account</a>.";
                        %>
                                <%@include file="WEB-INF/includes/errorBang.jspf" %>
                                    <%
                        return;
                    }
                }
                else{
                    String errorMessage = "Incorrect log in. Try again or <a href='login.jsp'>Request an Account</a>.";
                    %>
                                        <%@include file="WEB-INF/includes/errorBang.jspf" %>
                                            <%
                    return;
                }
            }
       }
   %>
                                                <%
            user.User thisUser = null;
            if (session.getAttribute("UID") != null)
                {%>
                                                    <script>
                                                        document.location = "my-transcriptions.html";
                                                    </script>
                                                    <%
                thisUser = new user.User(Integer.parseInt(session.getAttribute("UID").toString()));
                }%>
                                                        <html>

                                                        <head>
                                                            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                                                            <title>Login or Register a New Account</title>
                                                            <link rel="stylesheet" href="css/style.css" type="text/css" media="screen, projection">
                                                            <link rel="stylesheet" href="https://french.newberry.t-pen.org/www/css/style.css">
                                                            <link rel="shortcut icon" type="image/x-icon" href="https://newberry.org/sites/all/themes/newberry2015/favicon.ico">
                                                            <style>
                                                                #login,
                                                                #register,#forgetForm {
                                                                    width: 45%;
                                                                    padding: 10px;
                                                                    margin: 0 auto;
                                                                }
                                                                
                                                                #content {
                                                                    max-width: 800px;
                                                                }
                                                                
                                                            </style>
                                                        </head>
                                                        <!--    <script type="text/javascript" src="menu.js"></script>-->

                                                        <body>
                                                            <header class="header clearfix">
                                                                <div id="branding" class="branding-elements clearfix">
                                                                    <div style="margin: 0px auto;">
                                                                        <div class="newberry-header hiddem-sm hidden-xs">
                                                                        </div>
                                                        
                                                                        <h1 id="site-name">
                                                                            <div id="logo" style="display: inline;">
                                                                                <img aria-hidden="true" role="presentation" alt=""
                                                                                    src="https://french.newberry.t-pen.org/www/images/NewberryLogo_with_tag.png">
                                                                            </div>
                                                                        </h1>
                                                                    </div>
                                                                </div>
                                                                <nav class="container">
                                                                    <ul class="nav nav-bar">
                                                                        <li class="first leaf">
                                                                            <a href="https://french.newberry.t-pen.org/">French
                                                                                Renaissance Paleography</a>
                                                                        </li>
                                                                        <li class="leaf">
                                                                            <a href="https://italian.newberry.t-pen.org/">Italian
                                                                                Paleography</a>
                                                                        </li>
                                                                        <li class="last leaf">
                                                                            <a href="https://newberry.t-pen.org/paleography/logout.html" title="">Logout</a>
                                                                        </li>
                                                                    </ul>
                                                                </nav>
                                                            </header>
                                                             
    <div id="login" class="left">
        <h3 class="ui-widget-header ui-tabs ui-corner-all ui-state-default">Log In</h3>
        <p> You may log into your account to start transcribing or to manage your projects.</p>
        <form id="login" action="login.jsp" method="POST">
            <fieldset>
                <legend>Login Here:</legend>
                <label for="uname">Username</label><input class="text" type="text" name="uname" /><br/>
                <label for="password">Password</label><input class="text" type="password" name="password" /><br/>
                <input type="hidden" name="ref" value='<%out.print(session.getAttribute(" ref "));%>'/>
                <input class="ui-button ui-state-default ui-corner-all right" type="submit" title="Log In" value="Log In">
            </fieldset>
        </form>
    </div>
    <div id="register" class="right">
        <h3 class="ui-widget-header ui-tabs ui-corner-all ui-state-default">Register a New Account</h3>
        <p>Note: You will receive your password via email after your account is activated</p>
        <form action="signup.jsp" method="POST">
            <fieldset>
                <legend>or Register as a New User:</legend>
                <label for="uname">Username</label><input class="text" type="text" name="uname" /><br/>
                <label for="email">Email</label><input class="text" type="text" name="email" /><br/>
                <label for="fname">First Name</label><input class="text" type="text" name="fname" /><br/>
                <label for="lname">Last Name</label><input class="text" type="text" name="lname" /><br/>
                <input type="submit" value="Register" class="ui-button ui-state-default ui-corner-all right" />
            </fieldset>
        </form>
    </div>
    <div id="resetPassword" style="padding: 10px;">
        <form id="forgetForm" action="admin.jsp" method="POST" class="ui-corner-all">
            <fieldset>
                <legend>Request a Password Reset:</legend>
                <input type="text" class="text" placeholder="Username" name="uname">
                <input class="right ui-corner-all ui-state-default" type="submit" name="resetSubmitted" value="Reset Password" />
            </fieldset>
        </form>
    </div>
<a href="./">Return to Paleography Home</a>
<link rel="stylesheet" href="https://french.newberry.t-pen.org/www/css/style.css">
<footer class="row container">
    <div class="col" style="flex-grow: 2;">
        <h2> Partners </h2>
        <div class="row">
          <a class="col" href="https://www.newberry.org/" target="_blank"><img alt="Newberry"
              src="https://french.newberry.t-pen.org/www/images/NewberryLogo_with_tag.png"></a>
          <a class="col" href="https://onesearch.library.utoronto.ca" target="_blank"><img
              alt="University of Toronto Libraries" src="https://french.newberry.t-pen.org/www/images/UTL-logo.png"></a>
        </div>
        <div class="row">
          <a class="col" href="https://lib.slu.edu/" style="line-height: 23.1111px;" target="_blank"><img
              alt="St. Louis University" src="https://centerfordigitalhumanities.github.io/Newberry-paleography/images/slu_ovpr.png" style="width: 470px;"></a>
          <a class="col" href="https://www.itergateway.org/" target="_blank"><img alt="Iter"
              src="https://french.newberry.t-pen.org/www/images/iter-logo-new.png"></a>
        </div>
      </div>
      <div class="col">
        <h2 class="pane-title"> Contact </h2>
        <p><a href="https://french.newberry.t-pen.org/contact">Contact</a><br><a href="https://french.newberry.t-pen.org/about-team">About the
            Team</a><br>
        </p>
        <p>Supported by a grant from The Andrew W. Mellon Foundation</p>
        <p><a href="http://creativecommons.org/licenses/by-nc-nd/4.0/" rel="license"><img alt="Creative Commons Licence"
              src="https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png" style="width:88px"></a><br><a
            href="https://www.newberry.org/paleography">French Renaissance Paleography</a> is licensed under a <a
            href="http://creativecommons.org/licenses/by-nc-nd/4.0/" rel="license">Creative Commons
            Attribution-NonCommercial-NoDerivatives 4.0 International License</a>.</p>
      </div>
    </footer>
</body>

</html>
