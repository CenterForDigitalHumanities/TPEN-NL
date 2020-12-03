/*
 * Copyright 2013- Saint Louis University. Licensed under the
 *	Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 * http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
package edu.slu.tpen.servlet;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import static edu.slu.util.LangUtils.buildQuickMap;
import edu.slu.util.ServletUtils;
import static edu.slu.util.ServletUtils.reportInternalError;
import textdisplay.Project;
import user.User;


/**
 * Retrieve all projects that belong to a given user.
 * This is a transformation of tpen function to web service. It's using tpen MySQL database. 
 * @author tarkvara
 */
public class GetAllUserProjects extends HttpServlet {


   /**
    * Handles the HTTP <code>GET</code> method, returning a list of projects available to the current user.
    *
    * @param req servlet request
    * @param resp servlet response
    * @throws ServletException if a servlet-specific error occurs
    * @throws IOException if an I/O error occurs
    */
   @Override
   protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        int session_userID = ServletUtils.getUID(req, resp); //The logged in user that asked for the list
        resp.setContentType("application/json; charset=utf-8");
        req.setCharacterEncoding("UTF-8");
        if(session_userID > 0) {
            int lookup_userID; //The userID whose projects list the requestor wants
            if(null == req.getParameter("uid")){
                //Then the user that is logged in wants their own project list
                lookup_userID = session_userID;
            }
            else{
                //The user that is logged in is asking for a different user's projects list.
                lookup_userID = Integer.parseInt(req.getParameter("uid"));
            }
            try {
                User requestor = new User(session_userID);
                User lookup = new User(lookup_userID);
                if(requestor.isAdmin() || session_userID == lookup_userID){
                   Project[] projs = lookup.getUserProjects();
                   List<Map<String, Object>> result = new ArrayList<>();
                   for (Project p: projs) {
                      result.add(buildQuickMap("id", ""+p.getProjectID(), "name", p.getProjectName()));
                   }
                   ObjectMapper mapper = new ObjectMapper();
                   mapper.writeValue(resp.getOutputStream(), result);
                }
                else{
                   resp.sendError(HttpServletResponse.SC_FORBIDDEN);
                }
            } 
            catch (SQLException ex) {
                reportInternalError(resp, ex);
            }
        } 
        else{
            resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
        }
   }

   /**
    * {@inheritDoc}
    */
   @Override
   public String getServletInfo() {
      return "Project List Servlet";
   }
}
