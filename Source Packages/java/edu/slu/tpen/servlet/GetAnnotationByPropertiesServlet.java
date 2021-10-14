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
import java.net.URLEncoder;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Get annotations by properties. It's not from tpen. It is a rerum.io service. 
 * @author hanyan
 */
public class GetAnnotationByPropertiesServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        System.out.println("Get annotation by properties internal servlet params below...");
        System.out.println(request.getParameter("content"));
        String l = request.getParameter("limit");
        String s = request.getParameter("skip");
        int lim = 75;
        int skip = 0;
        if(null != l){
            try{
                lim = Integer.parseInt(l);
            }
            catch(Exception e){
                lim = 75;
            }
        }
        if(null != s){
            try{
                skip = Integer.parseInt(s);
            }
            catch(Exception e){
                skip = 0;
            }
        }
        String serv = "/getByProperties.action?skip=" + skip + "&limit=" + lim;
            
        //Point to rerum server v1
        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + serv);
        HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setRequestMethod("POST");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.connect();
        DataOutputStream out = new DataOutputStream(connection.getOutputStream());
        //value to save
        System.out.println("write");
        out.writeBytes(request.getParameter("content"));
        out.flush();
        out.close(); // flush and close
        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
        String line="";
        StringBuilder sb = new StringBuilder();
        while ((line = reader.readLine()) != null){
            //line = new String(line.getBytes(), "utf-8");
            sb.append(line);
        }
        reader.close();
        connection.disconnect();
        response.setHeader("Content-Location", "absoluteURI");
        response.getWriter().print(sb.toString());
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        this.doPost(req, resp); 
    }
    
}
