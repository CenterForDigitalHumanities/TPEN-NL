/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package edu.slu.tpen.servlet;

import java.io.IOException;
import java.sql.SQLException;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import edu.slu.util.ServletUtils;
import java.util.logging.Level;
import java.util.logging.Logger;
import user.User;

/**
 *
 * @author bhaberbe
 */
public class DeleteProject extends HttpServlet {

    /**
     * Processes requests for both HTTP <code>GET</code> and <code>POST</code>
     * methods.
     *
     * @param request servlet request
     * @param response servlet response
     * @throws ServletException if a servlet-specific error occurs
     * @throws IOException if an I/O error occurs
     */
    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException, SQLException {
        request.setCharacterEncoding("UTF-8");
        int session_userID = ServletUtils.getUID(request, response); //The logged in user that asked for the list
        if(session_userID > 0) {
            if (request.getParameter("projectID") != null) {
                int projectNumToDelete = Integer.parseInt(request.getParameter("projectID"));
                textdisplay.Project todel = new textdisplay.Project(projectNumToDelete);
                user.Group projectGroup = new user.Group(todel.getGroupID());
                User requestor = new User(session_userID);
                boolean isMember = projectGroup.isMember(session_userID);
                boolean isAdmin = (requestor.isAdmin() || projectGroup.isAdmin(session_userID));
                if(isAdmin){
                    isMember = isAdmin;
                }
                if (isAdmin) {
                    todel.delete();
                    response.getWriter().print("Project "+projectNumToDelete+" deleted successfully.");
                } 
                else {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN);
                }
            }
            else{
                response.sendError(HttpServletResponse.SC_BAD_REQUEST);
            }
        }
        else{
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
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
            Logger.getLogger(DeleteProject.class.getName()).log(Level.SEVERE, null, ex);
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
            Logger.getLogger(DeleteProject.class.getName()).log(Level.SEVERE, null, ex);
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
