/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package edu.slu.tpen.servlet;

import com.mongodb.util.JSONParseException;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
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
 *
 * @author bhaberbe
 */
public class UpdateV0AnnoListServlet extends HttpServlet {

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        int codeOverwrite = 500;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setCharacterEncoding("UTF-8");
        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/update.action");
            HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        //https://stackoverflow.com/questions/25163131/httpurlconnection-invalid-http-method-patch
        connection.setRequestMethod("PUT");
        
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        String line="";
        StringBuilder sb = new StringBuilder();
        try {
            JSONObject updateObject = new JSONObject();
            updateObject = JSONObject.fromObject(request.getParameter("content"));
            //We will only evener be altering the resources property here, no need to PUT update.  Just PATCH.  
            TokenManager man = new TokenManager();
            String pubTok = man.getAccessToken();
            boolean expired = man.checkTokenExpiry();
            if(expired){
                System.out.println("TPEN_NL detected an expired token, auto getting and setting a new one...");
                pubTok = man.generateNewAccessToken();
            }
            connection.setRequestProperty("Authorization", "Bearer "+pubTok);
            updateObject.element("TPEN_NL_TESTING", man.getProperties().getProperty("TESTING"));
            connection.connect();
            DataOutputStream out = new DataOutputStream(connection.getOutputStream());
            //value to save
            //The TPEN_NL javascript is stil handing to the proxy API wrapped in content:{}.  We can unwrap as RERUM no longer imposes this. 
            out.writeBytes(updateObject.toString());
            out.flush();
            out.close(); // flush and close
            codeOverwrite = connection.getResponseCode();
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
            while ((line = reader.readLine()) != null){
                //line = new String(line.getBytes(), "utf-8");  
//                System.out.println(line);
                sb.append(line);
            }
            reader.close();
            // We could completely overwrite the response headers with the RERUM response headers if desired.  Here are the important ones
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
            //Most fail responses from RERUM will throw you here, send out what RERUM said. 
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
        } catch (JSONParseException ex){
            Logger.getLogger(UpdateAnnoListServlet.class.getName()).log(Level.SEVERE, null, ex);
            System.out.println("TPEN_NL object for update was not JSON, could not add testing flag.");
            connection.disconnect();
            response.setStatus(codeOverwrite);
            response.getWriter().print(ex);
        } catch (Exception ex) {
             Logger.getLogger(UpdateAnnoListServlet.class.getName()).log(Level.SEVERE, null, ex);
             connection.disconnect();
             response.setStatus(codeOverwrite);
             response.getWriter().print(ex);
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
        processRequest(request, response);
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
        processRequest(request, response);
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

}
