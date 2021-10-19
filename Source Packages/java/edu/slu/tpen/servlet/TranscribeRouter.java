/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package edu.slu.tpen.servlet;

import edu.slu.tpen.entity.Image.Canvas;
import edu.slu.tpen.servlet.util.CreateAnnoListUtil;
import edu.slu.util.ServletUtils;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.sql.Connection;
import java.sql.SQLException;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import net.sf.json.JSONArray;
import net.sf.json.JSONException;
import net.sf.json.JSONObject;
import textdisplay.Folio;
import textdisplay.Project;
import tokens.TokenManager;
import user.User;

/**
 *
 * @author bhaberbe
 */
public class TranscribeRouter extends HttpServlet {

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException, SQLException {
        req.setCharacterEncoding("UTF-8");
        String projectName = "";
        int uid = ServletUtils.getUID(req, resp);
        Project proj = null;
        String interfaceLink = "";
        TokenManager man = new TokenManager();
        int folioNum = -1;
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "GET");
        if (uid >= 0) {
            projectName = req.getPathInfo().substring(1);
            User lookup = new User(uid);
            proj = lookup.getUserProjectForPaleoObject(projectName);         
            if (null != proj && proj.getProjectID() > 0) {
                //Then this user has a project already.  Redirect to that project.
                folioNum = proj.firstPage();
                if(folioNum > -1){
                   interfaceLink = proj.mintInterfaceLinkFromFolio(folioNum);
                   resp.sendRedirect(man.getProperties().getProperty("SERVERURL")+interfaceLink);
                }
                else{
                    System.out.println("Could not mint interface link.  There was no folio.");
                    resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                }
            } 
            else{
                //This user did not have a project yet.  Get the master project ID, run /copyProject, and redirect to the resulting link
                int masterID = Project.getMasterProjectID(projectName);
                int copiedProjectID = copyProjectAndLineParsing(uid, masterID, req.getLocalName());
                if(copiedProjectID > 0){
                    proj = new Project(copiedProjectID);
                    folioNum = proj.firstPage();
                    if(folioNum > -1){
                       interfaceLink = proj.mintInterfaceLinkFromFolio(folioNum);
                       resp.sendRedirect(man.getProperties().getProperty("SERVERURL")+interfaceLink);
                    }
                    else{
                        System.out.println("Could not mint interface link.  There was no folio.  Redirect not possible.");
                        resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    }
                }
                else{
                    System.out.println("Could not copy project.  Redirect not possible.");
                    resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                }
            }
        } 
        else {
            //They need to be logged into T-PEN to run this!
            //TODO! When we have the auth workflow right, we will need to redirect them appropriately.
            System.out.println("You must be logged in to activate the /transcribe router!");
            resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
        }
    }

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the code.">
    /**
     * Handles the HTTP <code>GET</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (SQLException ex) {
            Logger.getLogger(TranscribeRouter.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (SQLException ex) {
            Logger.getLogger(TranscribeRouter.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    /**
     * Same logic as the copyProjectAndTranscription Servlet
     * @param uID
     * @param projectID
     * @param localName
     * @return 
     */
    private int copyProjectAndTranscription(int uID, int projectID, String localName){
        int result = -1;
        boolean er = false;
        DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss.SSS");
        Date date = new Date();
        //System.out.println("Copying at "+dateFormat.format(date));    
        try {
            //find original project and copy to a new project. 
            Project templateProject = new Project(projectID);
            Connection conn = ServletUtils.getDBConnection();
            conn.setAutoCommit(false);
            //in this method, it copies everything about the project.
            if(null != templateProject.getProjectName())
            {
                Project thisProject = new Project(templateProject.copyProjectWithoutTranscription(conn, uID));
                TokenManager man = new TokenManager();
                //set partner project. It is to make a connection on switch board. 
                thisProject.setAssociatedPartnerProject(projectID);
                //^^copyProjectWithoutTranscription does special chars and XML 
                conn.commit();
                Folio[] folios = thisProject.getFolios();
                //System.out.println("Created a new project template.  What was the ID assigned to it: "+thisProject.getProjectID());
                if(null != folios && folios.length > 0)
                {
                    for(int i = 0; i < folios.length; i++)
                    {
                        //System.out.println("Starting copy for canvas");
                        Folio folio = folios[i];
                        String imageURL = folio.getImageURL();
                        // use regex to extract paleography pid
                        //THIS MUST MATCH THE NAMING CONVENTION IN JSONLDEXporter
                        String canvasID = man.getProperties().getProperty("PALEO_CANVAS_ID_PREFIX") + imageURL.replaceAll("^.*(paleography[^/]+).*$", "$1"); //for paleo
                        JSONArray ja_allAnnoLists = Canvas.getAnnotationListsForProject(projectID, canvasID, uID, man);
                        JSONObject jo_annotationList = new JSONObject();
                        //^^ this does all the filtering and will either have 0 or 1 lists for this particular version of TPEN
                        if(!ja_allAnnoLists.isEmpty()){
                            jo_annotationList = ja_allAnnoLists.getJSONObject(0); 
                        }
                        JSONArray new_resources = new JSONArray();
                        JSONArray resources = new JSONArray();
                        String parseThis;
                        String pubTok = man.getAccessToken();
                        boolean expired = man.checkTokenExpiry();
                        if(expired){
                            System.out.println("TPEN_NL Token Manager detected an expired token, auto getting and setting a new one...");
                            pubTok = man.generateNewAccessToken();
                        }
                        if(!jo_annotationList.isEmpty() && (null != jo_annotationList.get("resources") && !jo_annotationList.get("resources").toString().equals("[]"))){
                            try{
                                resources = (JSONArray) jo_annotationList.get("resources");
                            }
                            catch(JSONException e){
                                System.out.println("List we found could not be parsed, so we are defaulting with an empty list.");
                                //If this list can't be parsed, the copied list will have errors.  Just define it as empty as the fail.  
                            }
                            //add testing flag before passing off
                            for(int h=0; h<resources.size(); h++){
                                resources.getJSONObject(h).element("TPEN_NL_TESTING", man.getProperties().getProperty("TESTING"));
                                resources.getJSONObject(h).element("oa:createdBy", localName + "/" + uID);
                                resources.getJSONObject(h).remove("_id");
                                resources.getJSONObject(h).remove("@id");
                                resources.getJSONObject(h).remove("addedTime");
                                resources.getJSONObject(h).remove("originalAnnoID");
                                resources.getJSONObject(h).remove("version");
                                resources.getJSONObject(h).remove("permission");
                                resources.getJSONObject(h).remove("forkFromID"); // retained for legacy v0 objects
                                resources.getJSONObject(h).remove("serverName");
                                resources.getJSONObject(h).remove("serverIP");
                            }

                            URL postUrlCopyAnno = new URL(Constant.ANNOTATION_SERVER_ADDR + "/batch_create.action");
                            HttpURLConnection ucCopyAnno = (HttpURLConnection) postUrlCopyAnno.openConnection();
                            ucCopyAnno.setDoInput(true);
                            ucCopyAnno.setDoOutput(true);
                            ucCopyAnno.setRequestMethod("POST");
                            ucCopyAnno.setUseCaches(false);
                            ucCopyAnno.setInstanceFollowRedirects(true);
                            ucCopyAnno.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                            ucCopyAnno.setRequestProperty("Authorization", "Bearer "+pubTok);
                            ucCopyAnno.connect();
                            DataOutputStream dataOutCopyAnno = new DataOutputStream(ucCopyAnno.getOutputStream());
                            String str_resources = "";
                            if(resources.size() > 0){
                                str_resources = resources.toString();
                            }
                            else{
                                str_resources = "[]";
                            }
//                                System.out.println("Batch create these");
//                                System.out.println(str_resources);
                            byte[] toWrite = str_resources.getBytes("UTF-8");
                            dataOutCopyAnno.write(toWrite);
                            dataOutCopyAnno.flush();
                            dataOutCopyAnno.close();
                            String lines = "";
                            StringBuilder sbAnnoLines = new StringBuilder();
                            try{
                                BufferedReader returnedAnnoList = new BufferedReader(new InputStreamReader(ucCopyAnno.getInputStream(),"utf-8"));
                                while ((lines = returnedAnnoList.readLine()) != null){
    //                                    System.out.println(lineAnnoLs);
                                    sbAnnoLines.append(lines);
                                }
                                returnedAnnoList.close();
                            }
                            catch (IOException ex){
                                //Forward error response from RERUM
                                BufferedReader error = new BufferedReader(new InputStreamReader(ucCopyAnno.getErrorStream(),"utf-8"));
                                String errorLine = "";
                                StringBuilder sb = new StringBuilder();
                                while ((errorLine = error.readLine()) != null){  
                                    sb.append(errorLine);
                                } 
                                error.close();
                                result = -1;
                                er = true;
                                break;
                            }
                            ucCopyAnno.disconnect();
                            parseThis = sbAnnoLines.toString();                              
                            JSONObject batchSaveResponse = JSONObject.fromObject(parseThis);
                            try{
                                new_resources = (JSONArray) batchSaveResponse.get("new_resources");
                            }
                            catch(JSONException e){
                               System.out.println("Batch save response does not contain JSONARRAY in new_resouces.");
                               result = -1;
                               er = true;
                               break;
                            }
                        }
                        else{
                            //System.out.println("No annotation list for this canvas.  do not call batch save.  just save empty list.");
                        }
                        JSONObject canvasList = CreateAnnoListUtil.createAnnoList(thisProject.getProjectID(), canvasID, man.getProperties().getProperty("TESTING"), new_resources, uID, localName);
                        canvasList.element("copiedFrom", projectID);
                        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/create.action");
                        HttpURLConnection uc = (HttpURLConnection) postUrl.openConnection();
                        uc.setDoInput(true);
                        uc.setDoOutput(true);
                        uc.setRequestMethod("POST");
                        uc.setUseCaches(false);
                        uc.setInstanceFollowRedirects(true);
                        uc.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                        uc.setRequestProperty("Authorization", "Bearer "+pubTok);
                        uc.connect();
                        DataOutputStream dataOut = new DataOutputStream(uc.getOutputStream());
                        byte[] toWrite2 = canvasList.toString().getBytes("UTF-8");
                        dataOut.write(toWrite2);
                        dataOut.flush();
                        dataOut.close();
                        try{
                            BufferedReader reader = new BufferedReader(new InputStreamReader(uc.getInputStream(),"utf-8")); 
                            reader.close();
                            uc.disconnect();
                        }
                        catch (IOException ex){
                            //forward error response from rerum
                            BufferedReader error = new BufferedReader(new InputStreamReader(uc.getErrorStream(),"utf-8"));
                            String errorLine = "";
                            StringBuilder sb = new StringBuilder();
                            while ((errorLine = error.readLine()) != null){  
                                sb.append(errorLine);
                            } 
                            error.close();
                            System.out.println(sb.toString());
                            result = -1;
                            er = true;
                            break;
                        }

                        //System.out.println("Finished this canvas.");
                    }
                }
                //System.out.println("Copy isPartOf and annos finished.  Whats the ID to return: "+thisProject.getProjectID());
                if(!er){
                    result = thisProject.getProjectID();
                }
                else{
                    result = -1;
                    System.out.println("There was an error.  Copy Project was not performed successfully");
                }
            }
            else{
                System.out.println("Could not get a project name, this is an error.");
                result = -1;
            }
        } 
        catch(Exception e){
            System.out.println("Exception Caught.  Could not copy project.");
            result = -1;
            System.out.println(e);
        }
        return result;
    }
    
    /**
     * Same logic as the copyProjectAndTranscription servlet
     * @param uID
     * @param projectID
     * @param localName
     * @return 
     */
    private int copyProjectAndLineParsing(int uID, int projectID, String localName){
        int result = -1;
        int codeOverwrite = 500;
        boolean er = false;
        try {
            //find original project and copy to a new project. 
            Project templateProject = new Project(projectID);
            Connection conn = ServletUtils.getDBConnection();
            conn.setAutoCommit(false);
            //in this method, it copies everything about the project.
            if(null != templateProject.getProjectName())
            {
                Project thisProject = new Project(templateProject.copyProjectWithoutTranscription(conn, uID));
                TokenManager man = new TokenManager();
                //set partner project. It is to make a connection on switch board. 
                thisProject.setAssociatedPartnerProject(projectID);
                //^^copyProjectWithoutTranscription does special chars and XML 
                conn.commit();
                Folio[] folios = thisProject.getFolios();
                //System.out.println("Created a new project template.  What was the ID assigned to it: "+thisProject.getProjectID());
                if(null != folios && folios.length > 0)
                {
                    for(int i = 0; i < folios.length; i++)
                    {
                        //System.out.println("Starting copy for canvas");
                        Folio folio = folios[i];
                        String imageURL = folio.getImageURL();
                        // use regex to extract paleography pid
                        //THIS MUST MATCH THE NAMING CONVENTION IN JSONLDEXporter
                        String canvasID = man.getProperties().getProperty("PALEO_CANVAS_ID_PREFIX") + imageURL.replaceAll("^.*(paleography[^/]+).*$", "$1"); //for paleo
                        JSONArray ja_allAnnoLists = Canvas.getAnnotationListsForProject(projectID, canvasID, uID, man);
                        JSONObject jo_annotationList = new JSONObject();
                        //^^ this does all the filtering and will either have 0 or 1 lists for this particular version of TPEN
                        if(!ja_allAnnoLists.isEmpty()){
                            jo_annotationList = ja_allAnnoLists.getJSONObject(0); 
                        }
                        JSONArray new_resources = new JSONArray();
                        JSONArray resources = new JSONArray();
                        String parseThis;
                        String pubTok = man.getAccessToken();
                        boolean expired = man.checkTokenExpiry();
                        if(expired){
                            System.out.println("TPEN_NL Token Manager detected an expired token, auto getting and setting a new one...");
                            pubTok = man.generateNewAccessToken();
                        }
                        if(!jo_annotationList.isEmpty() && (null != jo_annotationList.get("resources") && !jo_annotationList.get("resources").toString().equals("[]"))){
                            try{
                                resources = (JSONArray) jo_annotationList.get("resources");
                            }
                            catch(JSONException e){
                                System.out.println("List we found could not be parsed, so we are defaulting with an empty list.");
                                //If this list can't be parsed, the copied list will have errors.  Just define it as empty as the fail.  
                            }
                            //add testing flag before passing off
                            for(int h=0; h<resources.size(); h++){
                                resources.getJSONObject(h).element("TPEN_NL_TESTING", man.getProperties().getProperty("TESTING"));
                                resources.getJSONObject(h).element("oa:createdBy", localName + "/" + uID);
                                //Event empty lines have a resource, if it is ours it should be there.
                                if(resources.getJSONObject(h).has("resource")){
                                    resources.getJSONObject(h).getJSONObject("resource").element("cnt:chars", "");
                                }
                                resources.getJSONObject(h).remove("_id");
                                resources.getJSONObject(h).remove("@id");
                                resources.getJSONObject(h).remove("addedTime");
                                resources.getJSONObject(h).remove("originalAnnoID");
                                resources.getJSONObject(h).remove("version");
                                resources.getJSONObject(h).remove("permission");
                                resources.getJSONObject(h).remove("forkFromID"); // retained for legacy v0 objects
                                resources.getJSONObject(h).remove("serverName");
                                resources.getJSONObject(h).remove("serverIP");
                            }
                            URL postUrlCopyAnno = new URL(Constant.ANNOTATION_SERVER_ADDR + "/batch_create.action");
                            HttpURLConnection ucCopyAnno = (HttpURLConnection) postUrlCopyAnno.openConnection();
                            ucCopyAnno.setDoInput(true);
                            ucCopyAnno.setDoOutput(true);
                            ucCopyAnno.setRequestMethod("POST");
                            ucCopyAnno.setUseCaches(false);
                            ucCopyAnno.setInstanceFollowRedirects(true);
                            ucCopyAnno.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                            ucCopyAnno.setRequestProperty("Authorization", "Bearer "+pubTok);
                            ucCopyAnno.connect();
                            DataOutputStream dataOutCopyAnno = new DataOutputStream(ucCopyAnno.getOutputStream());
                            String str_resources = "";
                            if(resources.size() > 0){
                                str_resources = resources.toString();
                            }
                            else{
                                str_resources = "[]";
                            }
//                                System.out.println("Batch create these");
//                                System.out.println(str_resources);
                            byte[] toWrite = str_resources.getBytes("UTF-8");
                            dataOutCopyAnno.write(toWrite);
                            dataOutCopyAnno.flush();
                            dataOutCopyAnno.close();
                            codeOverwrite = ucCopyAnno.getResponseCode();
                            String lines = "";
                            StringBuilder sbAnnoLines = new StringBuilder();
                            try{
                                BufferedReader returnedAnnoList = new BufferedReader(new InputStreamReader(ucCopyAnno.getInputStream(),"utf-8"));
                                while ((lines = returnedAnnoList.readLine()) != null){
    //                                    System.out.println(lineAnnoLs);
                                    sbAnnoLines.append(lines);
                                }
                                returnedAnnoList.close();
                            }
                            catch (IOException ex){
                                //Forward error response from RERUM
                                BufferedReader error = new BufferedReader(new InputStreamReader(ucCopyAnno.getErrorStream(),"utf-8"));
                                String errorLine = "";
                                StringBuilder sb = new StringBuilder();
                                while ((errorLine = error.readLine()) != null){  
                                    sb.append(errorLine);
                                } 
                                error.close();
                                System.out.println(sb.toString());
                                result = -1;
                                er = true;
                                break;
                            }
                            ucCopyAnno.disconnect();
                            parseThis = sbAnnoLines.toString();                              
                            JSONObject batchSaveResponse = JSONObject.fromObject(parseThis);
                            try{
                                new_resources = (JSONArray) batchSaveResponse.get("new_resources");

                            }
                            catch(JSONException e){
                               System.out.println("Batch save response does not contain JSONARRAY in new_resouces.");
                               result = -1;
                               er = true;
                               break;
                            }
                        }
                        else{
                            //System.out.println("No annotation list for this canvas.  do not call batch save.  just save empty list.");
                        }
                        JSONObject canvasList = CreateAnnoListUtil.createAnnoList(thisProject.getProjectID(), canvasID, man.getProperties().getProperty("TESTING"), new_resources, uID, localName);
                        canvasList.element("copiedFrom", projectID);
                        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/create.action");
                        HttpURLConnection uc = (HttpURLConnection) postUrl.openConnection();
                        uc.setDoInput(true);
                        uc.setDoOutput(true);
                        uc.setRequestMethod("POST");
                        uc.setUseCaches(false);
                        uc.setInstanceFollowRedirects(true);
                        uc.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                        uc.setRequestProperty("Authorization", "Bearer "+pubTok);
                        uc.connect();
                        DataOutputStream dataOut = new DataOutputStream(uc.getOutputStream());
                        byte[] toWrite2 = canvasList.toString().getBytes("UTF-8");
                        dataOut.write(toWrite2);
                        dataOut.flush();
                        dataOut.close();
                        codeOverwrite = uc.getResponseCode();
                        try{
                            BufferedReader reader = new BufferedReader(new InputStreamReader(uc.getInputStream(),"utf-8")); 
                            reader.close();
                            uc.disconnect();
                        }
                        catch (IOException ex){
                            //forward error response from ererum
                            BufferedReader error = new BufferedReader(new InputStreamReader(uc.getErrorStream(),"utf-8"));
                            String errorLine = "";
                            StringBuilder sb = new StringBuilder();
                            while ((errorLine = error.readLine()) != null){  
                                sb.append(errorLine);
                            } 
                            error.close();
                            System.out.println(sb.toString());
                            result = -1;
                            er = true;
                            break;
                        }

                        //System.out.println("Finished this canvas.");
                    }
                }
                //System.out.println("Copy isPartOf and annos finished.  Whats the ID to return: "+thisProject.getProjectID());
                if(!er){
                    result =  thisProject.getProjectID();
                }
            }
            else{
                System.out.println("Could not get a project name, this is an error.");
                result = -1;
            }
        } 
        catch(Exception e){
            e.printStackTrace();
            System.out.println(e.getMessage());
        }
        return result;
    }

}

