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
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import textdisplay.Folio;
import textdisplay.Project;
import tokens.TokenManager;
import user.Group;
import user.User;

/**
 * Create a manuscript, folio and project for New Berry. This part is a transformation of tpen function to web service. 
 * Servlet also adds annotation list to each canvas (also known as foliio in old tpen) using rerum.io. 
 * @author hanyan
 */
public class CreateProjectServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        PrintWriter writer = response.getWriter();
        try {
            writer.print(creatManuscriptFolioProject(request, response)); //To change body of generated methods, choose Tools | Templates.
        } catch (Exception ex) {
            Logger.getLogger(CreateProjectServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
//        super.doGet(request, response); //To change body of generated methods, choose Tools | Templates.
        this.doPost(request, response);
    }
    
    private static String readAll(Reader rd) throws IOException {
        StringBuilder sb = new StringBuilder();
        int cp;
        while ((cp = rd.read()) != -1) {
          sb.append((char) cp);
        }
        return sb.toString();
    }

    
    private JSONObject resolveManifestURL(String url) throws MalformedURLException, IOException {
        System.out.println("Resolve URL "+url);
        InputStream is = new URL(url).openStream();
        try {
          BufferedReader rd = new BufferedReader(new InputStreamReader(is, Charset.forName("UTF-8")));
          String jsonText = readAll(rd);
          JSONObject json = JSONObject.fromObject(jsonText);   
          return json;
        } finally {
          is.close();
        }
    }

    /**
     * Create manuscript, folio and project using given json data.
     *
     * @param repository (optional)
     * @param archive (optional)
     * @param city (optional)
     * @param collection (optional)
     * @param title (optional)
     * @param urls
     * @param names
     */
    public String creatManuscriptFolioProject(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException, Exception {
        /*if(null != request.getSession().getAttribute("UID")){
         UID = (Integer) request.getSession().getAttribute("UID");
         }*/
        try {
            System.out.println("CREATE PROJECT");
            HttpSession session = request.getSession();
            Object role = "unknown";
            int UID = 0;
            /*if(null != request.getSession().getAttribute("UID")){
             UID = (Integer) request.getSession().getAttribute("UID");
             }*/
            UID = ServletUtils.getUID(request, response);
            boolean isTPENAdmin = (new User(UID)).isAdmin();
            if(null!=session.getAttribute("role")){
                role = session.getAttribute("role");
                if (role.toString().equals("1")) {
                    isTPENAdmin = true;
                }
            }
            if(!isTPENAdmin){
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                PrintWriter out = response.getWriter();
                out.print(HttpServletResponse.SC_UNAUTHORIZED);
                return "You must be an administrator to create a master project.";
            }
            //receive parameters.
            String repository = "newBerry";
            String archive = "";
            String city = "unknown";
            String collection = "unknown";

            city = request.getParameter("city");
            if (null == city) {
                city = "fromWebService";
            }
//            System.out.println("msID ============= " + m.getID());
//            String urls = request.getParameter("urls");
//            String [] seperatedURLs = urls.split(";");
//            String names = request.getParameter("names");
//            String [] seperatedNames = names.split(",");

            String str_manifest = request.getParameter("scmanifest"); //This will be a URL
            List<Integer> ls_folios_keys = new ArrayList();
            JSONObject manifest = new JSONObject();
            if (null != str_manifest) {
                manifest = resolveManifestURL(str_manifest);
                archive = manifest.getString("@id");
                JSONArray sequences = (JSONArray) manifest.get("sequences");
                List<String> ls_pageNames = new LinkedList();
                for (int i = 0; i < sequences.size(); i++) {
                    JSONObject inSequences = (JSONObject) sequences.get(i);
                    JSONArray canvases = inSequences.getJSONArray("canvases");
                    if (null != canvases && canvases.size() > 0) {
                        for (int j = 0; j < canvases.size(); j++) {
                            JSONObject canvas = canvases.getJSONObject(j);
                            ls_pageNames.add(canvas.getString("label"));
                            JSONArray images = canvas.getJSONArray("images");
                            if (null != images && images.size() > 0) {
                                for (int n = 0; n < images.size(); n++) {
                                    JSONObject image = images.getJSONObject(n);
                                    JSONObject resource = image.getJSONObject("resource");
                                    String imageName = resource.getString("@id");
                                    int folioKey = textdisplay.Folio.createFolioRecordFromNewBerry(city, canvas.getString("label"), imageName, archive, 98765, 0); //why imageName.replace('_', '&')
                                    ls_folios_keys.add(folioKey);
                                }
                            }
                        }
                    }
                }

            } else {
                return "You need a manifest to create a project.";
            }

            //create a project
            
            String tmpProjName = manifest.getString("label");
            if(tmpProjName == null || tmpProjName.equals("")){
                tmpProjName = "NO NAME";
            }
            try (Connection conn = ServletUtils.getDBConnection()) {
                conn.setAutoCommit(false);
                //This creates a master transcription, so the creating user is the leader so they can parse.
                Group newgroup = new Group(conn, tmpProjName, UID);
                Project newProject = new Project(conn, tmpProjName, newgroup.getGroupID());
                Folio[] array_folios = new Folio[ls_folios_keys.size()];
                TokenManager man = new TokenManager();
                String pubTok = man.getAccessToken();
                boolean expired = man.checkTokenExpiry();
                if(expired){
                    System.out.println("TPEN_NL Token Manager detected an expired token, auto getting and setting a new one...");
                    pubTok = man.generateNewAccessToken();
                }
                if (ls_folios_keys.size() > 0) {
                    for (int i = 0; i < ls_folios_keys.size(); i++) {
                        Folio folio = new Folio(ls_folios_keys.get(i));
                        array_folios[i] = folio;
                        String imageURL = folio.getImageURL();
                        // use regex to extract paleography pid
                        String canvasID = man.getProperties().getProperty("PALEO_CANVAS_ID_PREFIX") + imageURL.replaceAll("^.*(paleography[^/]+).*$", "$1");
                        //create anno list for original canvas
                        JSONObject annoList = CreateAnnoListUtil.createAnnoList(newProject.getProjectID(), canvasID, man.getProperties().getProperty("TESTING"), new JSONArray(), UID, request.getLocalName() );
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
                        byte[] toWrite = annoList.toString().getBytes("UTF-8");
                        dataOut.write(toWrite);
                        dataOut.flush();
                        dataOut.close();
                        BufferedReader reader = new BufferedReader(new InputStreamReader(uc.getInputStream(), "utf-8"));
                        reader.close();
                        uc.disconnect();
                    }
                }
                newProject.setFolios(conn, array_folios);
                newProject.addLogEntry(conn, "<span class='log_manuscript'></span>Added Manifest " + manifest.getString("@id"), UID);
                int projectID = newProject.getProjectID();
                newProject.importData(UID);
                conn.commit();
                String propVal = man.getProperties().getProperty("CREATE_PROJECT_RETURN_DOMAIN");
                //return trimed project url
                return propVal + "/project/" + projectID;
            }
        } catch (SQLException ex) {
            Logger.getLogger(CreateProjectServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
        return "500";
    }

}
