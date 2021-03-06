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

import edu.slu.tpen.servlet.util.CreateAnnoListUtil;
import edu.slu.util.ServletUtils;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.sql.Connection;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import textdisplay.Folio;
import textdisplay.PartnerProject;
import textdisplay.Project;
import tokens.TokenManager;

/**
 * Copy project from a template project(or called standard project) which is created by NewBerry. 
 * Clear all transcription data from project and connect the new project 
 * to the template project on switch board. 
 * @author hanyan
 */
public class CopyProjectDataOnly extends HttpServlet {
    
    @Override
    /**
     * @param projectID
     * @param uID
     */
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String result = "";
        int uID = ServletUtils.getUID(request, response);
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setCharacterEncoding("UTF-8");
        DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss.SSS");
        Date date = new Date();
        if(null == request.getParameter("projectID")){
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            result = "Invalid project speficied.";
        }
        else if(uID == -1){
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            result = "You are not logged in.";
        }
        else{
            Integer projectID = Integer.parseInt(request.getParameter("projectID"));
            try {
                //find original project and copy to a new project. 
                Project templateProject = new Project(projectID);
                Connection conn = ServletUtils.getDBConnection();
                conn.setAutoCommit(false);
                //in this method, it copies everything about the project.
                if(null != templateProject.getProjectName())
                {
                    TokenManager man = new TokenManager();
                    String pubTok = man.getAccessToken();
                    boolean expired = man.checkTokenExpiry();
                    if(expired){
                        System.out.println("TPEN_NL Token Manager detected an expired token, auto getting and setting a new one...");
                        pubTok = man.generateNewAccessToken();
                    }
                    Project thisProject = new Project(templateProject.copyProjectWithoutTranscription(conn, uID));
                    //set partener project. It is to make a connection on switch board. 
                    thisProject.setAssociatedPartnerProject(projectID);
                    conn.commit();
                    Folio[] folios = thisProject.getFolios();
                    if(null != folios && folios.length > 0)
                    {
                        for(int i = 0; i < folios.length; i++)
                        {
                            Folio folio = folios[i];
                            //Parse folio.getImageURL() to retrieve paleography pid, and then generate new canvas id
                            String imageURL = folio.getImageURL();
                            // use regex to extract paleography pid
                            String canvasID = man.getProperties().getProperty("PALEO_CANVAS_ID_PREFIX") + imageURL.replaceAll("^.*(paleography[^/]+).*$", "$1");
                            String testingProp = "true";
                            JSONObject annoList = CreateAnnoListUtil.createAnnoList(thisProject.getProjectID(), canvasID, testingProp, new JSONArray(), uID, request.getLocalName());
                            URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/create.action");
                            HttpURLConnection uc = (HttpURLConnection) postUrl.openConnection();
                            uc.setDoInput(true);
                            uc.setDoOutput(true);
                            uc.setRequestMethod("POST");
                            uc.setUseCaches(false);
                            uc.setInstanceFollowRedirects(true);
                            uc.addRequestProperty("Content-Type", "application/json; charset=utf-8");
                            uc.setRequestProperty("Authorization", "Bearer "+pubTok);
                            uc.connect();
                            DataOutputStream dataOut = new DataOutputStream(uc.getOutputStream());
                            dataOut.writeBytes(annoList.toString());
                            dataOut.flush();
                            dataOut.close();
//                            BufferedReader reader = new BufferedReader(new InputStreamReader(uc.getInputStream(),"utf-8"));
//                            String line="";
//                            StringBuilder sb = new StringBuilder();
//                            while ((line = reader.readLine()) != null){  
//                                //We are not doing anything with the response to this save.
//                                System.out.println(line);
//                                sb.append(line);
//                            }
//                            System.out.println("RESPONSE");
//                            System.out.println(sb.toString());
//                            reader.close();
                            uc.disconnect();
                        }
                    }
                    
                    String propVal = man.getProperties().getProperty("CREATE_PROJECT_RETURN_DOMAIN"); 
                    result = propVal + "/project/" + thisProject.getProjectID();
                }
            } catch(Exception e){
                e.printStackTrace();
            }
        }
        response.getWriter().print(result);
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        doPost(request, response);
    }
}
