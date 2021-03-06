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

import edu.slu.util.ServletUtils;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import net.sf.json.JSONObject;
import user.User;

/**
 * Get user info by user id. 
 * This is a transformation of tpen function to web service. It's using tpen MySQL database. 
 * @author hanyan
 */
public class UserInfoServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        PrintWriter out = response.getWriter();
        HttpSession session = request.getSession();
        
        int UID = ServletUtils.getUID(request, response);
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.addHeader("Access-Control-Allow-Headers", "Content-Type");
        response.addHeader("Access-Control-Allow-Methods", "*");
        if(null != session && UID > 0){
            try {
                User user = new User(UID);
                JSONObject jo = new JSONObject();
                jo.element("uid", user.getUID());
                jo.element("uname", user.getUname());
                out.print(jo);
            } catch (SQLException ex) {
                Logger.getLogger(UserInfoServlet.class.getName()).log(Level.SEVERE, null, ex);
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        }else{
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        doPost(req, resp); //To change body of generated methods, choose Tools | Templates.
    }
    
    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException {
            //These headers must be present to pass browser preflight for CORS
            response.addHeader("Access-Control-Allow-Origin", "*");
            response.addHeader("Access-Control-Allow-Headers", "*");
            response.addHeader("Access-Control-Allow-Methods", "*");
            response.setStatus(200);
    }
    
}
