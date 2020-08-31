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
public class UndoLine extends HttpServlet {

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
            doPost(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        int codeOverwrite = 500;
        resp.setHeader("Content-Type", "application/json; charset=utf-8");
        resp.setCharacterEncoding("UTF-8");
        //The TPEN_NL js still wraps requests to these proxies wrapping in content:{}.  We can unwrap it from the .js if we would like since RERUM no longer imposes this.  
        String content = req.getParameter("content");         
        StringBuilder sb = new StringBuilder();
        JSONObject jo = JSONObject.fromObject(content);
        String line;
        TokenManager manager = new TokenManager();
        String pubTok = manager.getAccessToken();
        boolean expired = manager.checkTokenExpiry();
        if(expired){
            try {
                pubTok = manager.generateNewAccessToken();
            } catch (Exception ex) {
                Logger.getLogger(UndoLine.class.getName()).log(Level.SEVERE, null, ex);
            }
        }
        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR+ "/delete.action");
        HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setRequestMethod("DELETE");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Authorization", "Bearer "+pubTok);
        connection.connect();
        try{
            DataOutputStream out = new DataOutputStream(connection.getOutputStream());
            //Pass in the user provided JSON for the body of the rerumserver v1 request
            out.writeBytes(jo.toString());
            out.flush();
            out.close(); 
            codeOverwrite = connection.getResponseCode();
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
            while ((line = reader.readLine()) != null){
                //Gather rerum server v1 response
                sb.append(line);
            }
            reader.close();
        }
        catch(IOException ex){
            //Need to get the response RERUM sent back.
            BufferedReader error = new BufferedReader(new InputStreamReader(connection.getErrorStream(),"utf-8"));
            String errorLine = "";
            while ((errorLine = error.readLine()) != null){  
                sb.append(errorLine);
            } 
            error.close();
        }
        resp.setStatus(codeOverwrite);
        resp.getWriter().print(sb.toString());
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
