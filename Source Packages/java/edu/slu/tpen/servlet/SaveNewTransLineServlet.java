/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package edu.slu.tpen.servlet;

import com.mongodb.util.JSONParseException;
import edu.slu.util.ServletUtils;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import net.sf.json.JSONObject;
import tokens.TokenManager;

/**
 * This servlet is used for IIIF store (rerum.io). It saves new trans-line to rerum.io. 
 * This is not from tpen. It utilizes rerum.io as its annotation repository. 
 * @author hanyan
 */
public class SaveNewTransLineServlet extends HttpServlet {
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        int codeOverwrite = 500;
        resp.setHeader("Content-Type", "application/json; charset=utf-8");
        resp.setCharacterEncoding("UTF-8");
        int UID = ServletUtils.getUID(req, resp);
        if(UID > 0){
            
            //The TPEN_NL js still wraps requests to these proxies wrapping in content:{}.  We can unwrap it from the .js if we would like since RERUM no longer imposes this.  
            String content = req.getParameter("content");         
            StringBuilder sb = new StringBuilder();
            JSONObject jo = JSONObject.fromObject(content);
            jo.element("oa:createdBy", req.getLocalName() + "/" + UID);
            URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/create.action");
            HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
            connection.setDoOutput(true);
            connection.setDoInput(true);
            connection.setRequestMethod("POST");
            connection.setUseCaches(false);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            try {
                //System.out.println("TPEN Try to save new line...");
                TokenManager man = new TokenManager();
                String pubTok = man.getAccessToken();
                boolean expired = man.checkTokenExpiry();
                if(expired){
                    System.out.println("TPEN_NL detected an expired token, auto getting and setting a new one...");
                    pubTok = man.generateNewAccessToken();
                }
                //TESTING FLAG CONTROL
                jo.element("TPEN_NL_TESTING", man.getProperties().getProperty("TESTING"));
                connection.setRequestProperty("Authorization", "Bearer "+pubTok);
                //System.out.println("TPEN is connected to RERUM create.action");
                connection.connect();
                DataOutputStream out = new DataOutputStream(connection.getOutputStream()); 
                byte[] toWrite = jo.toString().getBytes("UTF-8");
                out.write(toWrite);
                out.flush();
                out.close(); // flush and 
//                System.out.println("Gathering buffered reader for connection");
                //Throws exception if not a 2xx.  This has a 400 if @id is in body of anno...handle differently?
                //Can't get message in body back from RERUM if this throws exception here. 
                codeOverwrite = connection.getResponseCode();
                BufferedReader reader;
                String line="";
                
                reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
                while ((line = reader.readLine()) != null){  
                    sb.append(line);
                } 
                reader.close();
                resp.setStatus(codeOverwrite);
                //FIXME connection is coming out as 200 w/o Location header sometimes on successful RERUM create calls.  WHY?
                resp.setHeader("Location", connection.getHeaderField("Location"));
                connection.disconnect();
                resp.getWriter().print(sb.toString());
            } 
            catch (UnsupportedEncodingException ex) {
                Logger.getLogger(SaveNewTransLineServlet.class.getName()).log(Level.SEVERE, null, ex);
                connection.disconnect();
                resp.setStatus(codeOverwrite);
                resp.getWriter().print(ex);
            } catch (JSONParseException ex){
                Logger.getLogger(SaveNewTransLineServlet.class.getName()).log(Level.SEVERE, null, ex);
                connection.disconnect();
                resp.setStatus(codeOverwrite);
                resp.getWriter().print(ex);
            } catch (IOException ex) {
                //Buffered readers wrongly throw this exception for the gambit of restful responses.  Still read the error stream
                //from the connection to return to the front end so it doesn't get the generic exception and usese RERUM's response instead. 
                BufferedReader error = new BufferedReader(new InputStreamReader(connection.getErrorStream(),"utf-8"));
                String errorLine = "";
                while ((errorLine = error.readLine()) != null){  
                    sb.append(errorLine);
                } 
                error.close();
                Logger.getLogger(SaveNewTransLineServlet.class.getName()).log(Level.SEVERE, null, ex);
                connection.disconnect();
                resp.setStatus(codeOverwrite);
                resp.getWriter().print(sb.toString());
               
            } catch (Exception ex) {
                Logger.getLogger(SaveNewTransLineServlet.class.getName()).log(Level.SEVERE, null, ex);
                connection.disconnect();
                resp.setStatus(codeOverwrite);
                resp.getWriter().print(ex);
            }
        }else{
            resp.setStatus(401);
            resp.getWriter().print("You didn't log in. ");
            
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        this.doPost(req, resp); 
    }
    
}
