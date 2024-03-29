/*
 * Copyright 2014- Saint Louis University. Licensed under the
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

import static edu.slu.util.ServletUtils.getBaseContentType;
import static edu.slu.util.ServletUtils.getUID;
import static edu.slu.util.ServletUtils.reportInternalError;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import net.sf.json.JSONObject;
import textdisplay.Folio;
import textdisplay.Hotkey;
import textdisplay.Metadata;
import textdisplay.Project;
import textdisplay.ProjectPermissions;
import textdisplay.TagButton;
import user.Group;
import user.User;
import utils.Tool;
import utils.UserTool;

import com.google.gson.Gson;

import edu.slu.tpen.transfer.JsonImporter;
import edu.slu.tpen.transfer.JsonLDExporter;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import net.sf.json.JSONException;

/**
 * Get tpen project. 
 * This is a transformation of tpen function to web service. It's using tpen MySQL database. 
 * @author hanyan
 */
public class GetProjectTPENServlet extends HttpServlet {
    /**
    * Handles the HTTP <code>GET</code> method, returning a JSON-LD serialisation of the
    * requested T-PEN project.
    *
    * @param request servlet request
    * @param response servlet response
    * @throws ServletException if a servlet-specific error occurs
    * @throws IOException if an I/O error occurs
    */
   @Override
   protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        int uid = getUID(request, response);
        HttpSession session = request.getSession();
        boolean isTPENAdmin = false;
        try {
            isTPENAdmin = (new User(uid)).isAdmin();
        } catch (SQLException e) {
            e.printStackTrace();
        }
        request.setCharacterEncoding("UTF-8");
        response.setContentType("application/json; charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss.SSS");
        Date date = new Date();
        //System.out.println("Get project servlet at "+dateFormat.format(date));
        Gson gson = new Gson();
        Map<String, String> jsonMap = new HashMap();
        if (uid >= 0) {
//            System.out.println("UID ================= "+uid);
            try {
//                System.out.println("project id =============== " + request.getParameter("projectID"));
                int projID = Integer.parseInt(request.getParameter("projectID"));
                User currentUser = new User(uid);
                Project proj = new Project(projID);
                if (proj.getProjectID() > 0) {
                    Group group = new Group(proj.getGroupID());
//                    System.out.println("group Id ===== " + proj.getGroupID() + " is member " + group.isMember(uid));
                    if (group.isMember(uid) || isTPENAdmin) {
                        if (checkModified(request, proj)) {
                            jsonMap.put("project", gson.toJson(proj));
//                            System.out.println("project json ====== " + gson.toJson(proj));
                            int projectID = proj.getProjectID();
                            //get folio
                            Folio[] folios = proj.getFolios();
                            jsonMap.put("ls_fs", gson.toJson(folios));
//                            System.out.println("folios json ========== " + gson.toJson(folios));
                            //get project header
                            String header = proj.getHeader();
                            jsonMap.put("ph", header);
//                            System.out.println("header json ======= " + gson.toJson(header));
                            //get group members
                            User[] users = group.getMembers();
                            
                            User[] leaders = group.getLeader();
                            ArrayList<User> leaderList = new ArrayList<User>(Arrays.asList(leaders));
                            ArrayList<User> userList = new ArrayList<User>(Arrays.asList(users));
                            // if current user is admin AND not in leaders, add them to leaders array
                            boolean isLeader = false;
                            for (User u: leaders) {
                                if (u.getUID() == uid) {
                                    isLeader = true;
                                    break;
                                }
                            }
                            if(isTPENAdmin){
                                //Then University of Toronto stored this user in the admin table at one point through the loginHookSercvlet.
                                //add them to the project with this role on the fly
                                System.out.println("Leader from admin table");
                                isLeader = true;
                                leaderList.add(currentUser);
                                userList.add(currentUser);
                            }
                            if (!isLeader) {
                                Object role = "unknown";
                                if(null!=session.getAttribute("role")){
                                    role = session.getAttribute("role");
                                }
                                if (role.toString().equals("1")) {
                                    //Then University of Toronto login servlet decided this user was an admin, although they weren't in the TPEN admin table yet.
                                    //add them to the project with this role on the fly
                                    System.out.println("Leader from loginhook");
                                    leaderList.add(currentUser);
                                    userList.add(currentUser);
                                }
                            }
                            leaders = leaderList.toArray(new User[leaderList.size()]);
                            users = userList.toArray(new User[userList.size()]);
                            //System.out.println("What is the users array..");
                            //System.out.println("users json ========= " + gson.toJson(users));
                            //System.out.println("What is the leader array...");
                            //System.out.println("project leaders json ========= " + gson.toJson(leaders));

                            jsonMap.put("ls_u", gson.toJson(leaders));
                            jsonMap.put("ls_leader", gson.toJson(leaders));
                            //get project permission
                            ProjectPermissions pms = new ProjectPermissions(proj.getProjectID());
                            jsonMap.put("projper", gson.toJson(pms));
//                            System.out.println("project permission json ========= " + gson.toJson(pms));
                            //get project buttons
                            Hotkey hk = new Hotkey();
                            List<Hotkey> ls_hk = hk.getProjectHotkeyByProjectID(projectID, uid);
                            jsonMap.put("ls_hk", gson.toJson(ls_hk));
//                            System.out.println("hotkey json ======= " + gson.toJson(ls_hk));
                            //get project tools
                            UserTool[] projectTools = UserTool.getUserTools(projectID);
                            jsonMap.put("projectTool", gson.toJson(projectTools));
                            jsonMap.put("cuser", uid + "");
//                            System.out.println("usertools json ========= " + gson.toJson(projectTools));
                            //get user tools
                            Tool.tools[] userTools = Tool.getTools(uid);
                            jsonMap.put("userTool", gson.toJson(userTools));
                            //get project metadata
                            Metadata metadata = new Metadata(proj.getProjectID());                                                     
                            jsonMap.put("metadata", gson.toJson(metadata));
                            
//                            System.out.println("Here is the metadata i found...check spec chars");
//                            System.out.println(gson.toJson(metadata));
                            
                            String allProjectButtons = TagButton.getAllProjectButtons(projID);
                            //
                            jsonMap.put("xml", allProjectButtons);
                            //get special characters
                            jsonMap.put("projectButtons", hk.javascriptToAddProjectButtonsRawData(projectID));
                            
                            JSONObject man_obj = null;
                            String manifest_obj_str = "";
                            JSONObject manifest = new JSONObject();    
                            //System.out.println("UID gathered from session for exporter "+uid);
                            
                            manifest_obj_str = new JsonLDExporter(proj, new User(uid)).export();
                           // }
                            try{ //Try to parse the manifest string
                                man_obj = JSONObject.fromObject(manifest_obj_str);
                                manifest = man_obj;
                            }
                            catch (JSONException e2){
                                System.out.println("Could not JSON parse manifest");
                                response.sendError(500);
                                //jo_error.element("error", "Not a valid JSON manifest");
                                //manifest = jo_error;
                            }
                            jsonMap.put("manifest", manifest.toString());
                            response.setStatus(HttpServletResponse.SC_OK);
                            Date date2 = new Date();
                            //System.out.println("Get project done servlet at "+dateFormat.format(date2));
                            response.getWriter().print(JSONObject.fromObject(jsonMap));
                        } else {
                           response.setStatus(HttpServletResponse.SC_NOT_MODIFIED);
                        }
                    } else {
                       response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                    }
                } else {
                   response.sendError(HttpServletResponse.SC_NOT_FOUND);
                }
            } catch (NumberFormatException | SQLException | IOException ex) {
               throw new ServletException(ex);
            }
        } else {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
        }  
   }

   
   /**
    * Handles the HTTP <code>PUT</code> method, updating a project from a plain JSON serialisation.
    *
    * @param request servlet request
    * @param response servlet response
    * @throws ServletException if a servlet-specific error occurs
    * @throws IOException if an I/O error occurs
    */
   @Override
   protected void doPut(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
      receiveJsonLD(getUID(request, response), request, response);
   }

   /**
    * {@inheritDoc}
    */
   @Override
   public String getServletInfo() {
      return "T-PEN Project Import/Export Servlet";
   }

   private static void receiveJsonLD(int uid, HttpServletRequest request, HttpServletResponse response) throws IOException {
      if (uid >= 0) {
         try {
            int projID = Integer.parseInt(request.getPathInfo().substring(1));
            Project proj = new Project(projID);
            if (proj.getProjectID() > 0) {
               if (new Group(proj.getGroupID()).isMember(uid)) {
                  if (getBaseContentType(request).equals("application/json")) {
                     new JsonImporter(proj, uid).update(request.getInputStream());
                     response.setStatus(HttpServletResponse.SC_OK);
                  } else {
                     response.sendError(HttpServletResponse.SC_UNSUPPORTED_MEDIA_TYPE, "Expecting application/json");
                  }
               } else {
                  response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
               }
            } else {
               response.sendError(HttpServletResponse.SC_NOT_FOUND);
            }
         } catch (NumberFormatException | SQLException | IOException ex) {
            reportInternalError(response, ex);
         }
      } else {
         response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
      }
   }
   

   private boolean checkModified(HttpServletRequest request, Project proj) throws SQLException {
      boolean result = true;
      long modSince = request.getDateHeader("If-Modified-Since");
      if (modSince > 0) {
         Date projMod = proj.getModification();
         result = projMod.after(new Date(modSince));
      }
      return result;
   }
}
