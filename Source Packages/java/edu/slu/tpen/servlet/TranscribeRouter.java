/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/Servlet.java to edit this template
 */
package edu.slu.tpen.servlet;

import edu.slu.util.ServletUtils;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import net.sf.json.JSONObject;
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
        System.out.println("In /transcribe router");
        String paleoObj = "";
        int uid = ServletUtils.getUID(req, resp);
        boolean skip = true;
        TokenManager man = new TokenManager();
        //If you choose not to automatically skip, put some method here to define what makes skip true.
        resp.addHeader("Access-Control-Allow-Origin", "*");
        resp.addHeader("Access-Control-Allow-Methods", "GET");
        System.out.println("UID detected is "+uid);
        if (uid >= 0) {
            paleoObj = req.getPathInfo().substring(1);
            System.out.println("Name of proj is '"+paleoObj+"'");
            //paleoObj = req.getParameter("name");
            User lookup = new User(uid);
            Project proj = lookup.getUserProjectForPaleoObject(paleoObj);         
            if (null != proj && proj.getProjectID() > 0) {
                //Then this user has a project already.  Redirect to that project.
                System.out.println("Found existing project for user: "+proj.getProjectID());
                int folioNum = proj.firstPage();
                String interfaceLink = "";
                if(folioNum > -1){
                   interfaceLink = proj.mintInterfaceLinkFromFolio(folioNum);
                }
                String redirectURL = man.getProperties().getProperty("SERVERURL")+interfaceLink;
                resp.sendRedirect(redirectURL);
            } 
            else{
                //This user did not have a project yet.  Get the master project ID, run /copyProject, and redirect to the resulting link
                System.out.println("TODO run copy project and redirect to resulting ID");  
                resp.sendError(HttpServletResponse.SC_NOT_FOUND);
                int masterID = Project.getMasterProjectID(paleoObj);
                System.out.println("Is this the right masterID? '"+masterID+"'");
                
                /*
                URL postUrl = new URL(man.getProperties().getProperty("SERVERURL")+"copyProjectAndTranscription?projectID="+masterID); //copyProjectAndLineParsing
                HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
                connection.setDoOutput(true);
                connection.setDoInput(true);
                connection.setRequestMethod("POST");
                connection.setUseCaches(false);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.connect();
                DataOutputStream out = new DataOutputStream(connection.getOutputStream());
                out.flush();
                out.close(); 
                boolean er = false;
                StringBuilder sb = new StringBuilder();
                try{
                    BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
                    String line="";
                    while ((line = reader.readLine()) != null){
                        line = new String(line.getBytes(), "utf-8");
                        sb.append(line);
                    }
                    reader.close();
                    System.out.println("Copy project has finished for router");
                    System.out.println(sb.toString());
                    System.out.println(Integer.parseInt(sb.toString().replace(man.getProperties().getProperty("CREATE_PROJECT_RETURN_DOMAIN")+"project/", "")));
                    Project resultingProject = new Project(Integer.parseInt(sb.toString().replace(man.getProperties().getProperty("CREATE_PROJECT_RETURN_DOMAIN")+"project/", "")));
                    int folioNum = resultingProject.firstPage();
                    String interfaceLink = "";
                    if(folioNum > -1){
                       interfaceLink = proj.mintInterfaceLinkFromFolio(folioNum);
                    }
                    String redirectURL = "http://paleo.rerum.io/TPEN-NL/"+interfaceLink;
                    resp.sendRedirect(redirectURL);
                }
                catch (IOException ex){
                    //Copy Project Error
                    System.out.println("Copy Project Error in Transcribe Router...");
                    BufferedReader error = new BufferedReader(new InputStreamReader(connection.getErrorStream(),"utf-8"));
                    String errorLine = "";
                    while ((errorLine = error.readLine()) != null){  
                        sb.append(errorLine);
                    } 
                    error.close();
                    er = true;
                    System.out.println(sb.toString());
                }
                finally{
                    connection.disconnect();
                }
                */
            }
        } 
        else {
            /* They need to be logged into T-PEN to run this! */
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

}
