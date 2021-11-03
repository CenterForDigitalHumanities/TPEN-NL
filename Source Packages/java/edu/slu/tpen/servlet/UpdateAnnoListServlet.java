/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package edu.slu.tpen.servlet;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import net.sf.json.JSONObject;
import textdisplay.Folio;
import textdisplay.Project;
import tokens.TokenManager;

/**
 * Update annotation list from rerum.io. 
 * This is not tpen transformation. It utilizes rerum.io as its repository. 
 * @author hanyan
 */
public class UpdateAnnoListServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        int codeOverwrite = 500;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setCharacterEncoding("UTF-8");
        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/patch.action");
        HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        //https://stackoverflow.com/questions/25163131/httpurlconnection-invalid-http-method-patch
        connection.setRequestMethod("POST");
        connection.setRequestProperty("X-HTTP-Method-Override", "PATCH");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        String line="";
        StringBuilder sb = new StringBuilder();
        try {
            //We will only evener be altering the resources property here, no need to PUT update.  Just PATCH.  
            TokenManager man = new TokenManager();
            String pubTok = man.getAccessToken();
            boolean expired = man.checkTokenExpiry();
            if(expired){
                System.out.println("TPEN_NL detected an expired token, auto getting and setting a new one...");
                pubTok = man.generateNewAccessToken();
            }
            connection.setRequestProperty("Authorization", "Bearer "+pubTok);
            JSONObject updateObject = new JSONObject();
            String content = request.getParameter("content");
            updateObject = JSONObject.fromObject(content);
            updateObject.element("TPEN_NL_TESTING", man.getProperties().getProperty("TESTING"));
            /**
             * This is to support reports.jsp
             * When a user transcribes, their update line calls will contain the current folio and project.
             * Update the folio's lastModfiedTime with Date.now (Folio.paleography)
             * Update the project's lastModifiedFolio with the known Folio pageNumber (Project.lastModifiedFolio)
             * Note that reports.jsp does not expose Folio.paleography.  It was already being tracked, 
             * so I made sure to support while I was in this code.  They used it for something, not sure what. 
             */
            
            if(updateObject.containsKey("currentFolio")){
                int folioNum = Integer.parseInt(updateObject.getString("currentFolio"));
                Folio.setPaleographyDate(folioNum); //Track the last modified date for this folio
                if(updateObject.containsKey("currentProject")){
                    int projectID = Integer.parseInt(updateObject.getString("currentProject"));
                    Project.setLastModifiedFolio(projectID, folioNum); //Track the last modified folio for this project
                }
            }
            updateObject.remove("currentFolio");
            updateObject.remove("currentProject");
            connection.connect();
            DataOutputStream out = new DataOutputStream(connection.getOutputStream());
            //value to save
            //The TPEN_NL javascript is stil handing to the proxy API wrapped in content:{}.  We can unwrap as RERUM no longer imposes this. 
            byte[] toWrite = updateObject.toString().getBytes("UTF-8");
            out.write(toWrite);
            //out.writeBytes(updateObject.toString());
            out.flush();
            out.close(); // flush and close
            codeOverwrite = connection.getResponseCode();
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
            
            while ((line = reader.readLine()) != null){
                sb.append(line);
            }
            reader.close();
            response.setStatus(codeOverwrite);
            response.setHeader("Location", connection.getHeaderField("Location"));
            connection.disconnect();
            response.getWriter().print(sb.toString());
        } catch (UnsupportedEncodingException ex) {
            Logger.getLogger(UpdateAnnoListServlet.class.getName()).log(Level.SEVERE, null, ex);
            connection.disconnect();
            response.setStatus(codeOverwrite);
            response.getWriter().print(ex);
        } catch (IOException ex) {
            BufferedReader error = new BufferedReader(new InputStreamReader(connection.getErrorStream(),"utf-8"));
            String errorLine = "";
            while ((errorLine = error.readLine()) != null){  
                sb.append(errorLine);
            } 
            error.close();
            Logger.getLogger(UpdateAnnoListServlet.class.getName()).log(Level.SEVERE, null, ex);
            connection.disconnect();
            response.setStatus(codeOverwrite);
            response.getWriter().print(sb.toString());
        } catch (Exception ex) {
            System.out.println("TPEN_NL update anno list could not generate a new access token.  This may result in a 403.");
            Logger.getLogger(UpdateAnnoListServlet.class.getName()).log(Level.SEVERE, null, ex);
            connection.disconnect();
            response.setStatus(codeOverwrite);
            response.getWriter().print(ex);
        }
        
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        this.doPost(req, resp);
    }
}
