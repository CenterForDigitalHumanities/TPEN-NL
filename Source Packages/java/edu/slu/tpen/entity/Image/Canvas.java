/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package edu.slu.tpen.entity.Image;

import edu.slu.tpen.servlet.Constant;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import tokens.TokenManager;

/**
 *
 * @author hanyan
 */
public class Canvas {
    private String objectId;
    //for reference in the sc:AnnotationList
    private String id;
    private String type;
    private Integer height;
    private Integer width;
    private List<Image> ls_images;
    private List<OtherContent> ls_otherContent;

    public Canvas() {
    }

    public Canvas(String id, Integer height, Integer width, List<Image> ls_images, List<OtherContent> ls_otherContent) {
        this.id = id;
        this.height = height;
        this.width = width;
        this.ls_images = ls_images;
        this.ls_otherContent = ls_otherContent;
    }
    
    public JSONObject toJSON(){
        JSONObject jo = new JSONObject();
        jo.element("@id", this.id);
        jo.element("@type", this.type);
        jo.element("height", this.height);
        jo.element("width", this.width);
        JSONArray ja_images = new JSONArray();
        for(Image i : ls_images){
            ja_images.add(i.toJSON());
        }
        jo.element("images", ja_images);
        JSONArray ja_otherContent = new JSONArray();
        for(OtherContent oc : ls_otherContent){
            ja_otherContent.add(oc.toJSON());
        }
        jo.element("otherContent", ja_otherContent);
        return jo;
    }

    /**
     * @return the id
     */
    public String getId() {
        return id;
    }

    /**
     * @param id the id to set
     */
    public void setId(String id) {
        this.id = id;
    }

    /**
     * @return the type
     */
    public String getType() {
        return type;
    }

    /**
     * @param type the type to set
     */
    public void setType(String type) {
        this.type = type;
    }

    /**
     * @return the height
     */
    public Integer getHeight() {
        return height;
    }

    /**
     * @param height the height to set
     */
    public void setHeight(Integer height) {
        this.height = height;
    }

    /**
     * @return the width
     */
    public Integer getWidth() {
        return width;
    }

    /**
     * @param width the width to set
     */
    public void setWidth(Integer width) {
        this.width = width;
    }

    /**
     * @return the ls_images
     */
    public List<Image> getLs_images() {
        return ls_images;
    }

    /**
     * @param ls_images the ls_images to set
     */
    public void setLs_images(List<Image> ls_images) {
        this.ls_images = ls_images;
    }

    /**
     * @return the ls_otherContent
     */
    public List<OtherContent> getLs_otherContent() {
        return ls_otherContent;
    }

    /**
     * @param ls_otherContent the ls_otherContent to set
     */
    public void setLs_otherContent(List<OtherContent> ls_otherContent) {
        this.ls_otherContent = ls_otherContent;
    }
    
    /**
     * Check the annotation store for the annotation list on this canvas for this project.
     * @param projectID : the projectID the canvas belongs to
     * @param canvasID: The canvas ID the annotation list is on
     * @param UID: The current UID of the user in session.
     * @return : The annotation lists @id property, not the object.  Meant to look like an otherContent field.
     */
    public static JSONArray getAnnotationListsForProject(Integer projectID, String canvasID, Integer UID, TokenManager man) throws MalformedURLException, IOException {
        /*
            BH note 7/26/18
            In a traditional sense, if we find a list in v1 we don't have to check v0 anymore.  However, given the nature
            of this version of T-PEN (for French in particular), a situation has been created where most master transcriptions 
            and copied versions are in v0, and changes to copied versions are in v1.
        
            Now put yourself in the positions where you open a master transcription that has not been edited since its creation.  
            We got new lists from copied versions' edits from v1 and don't check v0.  We never find the master list, the code
            now determines this master project has no lists and tells the user there are no lines.
        
            If there are no lists selected by the time we get through all the v1 lines, then we have to check v0.  
        
            When a change is made to a master list it will be brought into v1.
        */
        
        /*
        System.out.println("getAnnotationListsForProject called.  Here are its parameters");
        System.out.println("ProjectID: "+projectID);
        System.out.println("CanvasID: "+canvasID);
        System.out.println("UID: "+UID);
        */
        DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss.SSS");
        Date date = new Date();
        //System.out.println("Ask for lists at "+dateFormat.format(date));
        URL postUrl = new URL(Constant.ANNOTATION_SERVER_ADDR + "/getByProperties.action");
        JSONObject historyWildCard = new JSONObject();
        historyWildCard.element("$exists", true);
        historyWildCard.element("$size", 0);
        JSONObject parameter = new JSONObject();
        parameter.element("@type", "sc:AnnotationList");
        parameter.element("on", canvasID);
        parameter.element("isPartOf", Integer.toString(projectID));
        parameter.element("__rerum.history.next", historyWildCard); //Wow this improves run time dramatically.  No need for the loop below with this. 
        //This means those that have a next because they were forked won't be found, but that shouldn't be a problem here.  
        //parameter.element("__rerum.generatedBy", man.getRegisteredAgent());
        //{ __rerum.history.next : { $exists: true, $size:0 } }
        //{__rerum.generatedBy : man.getRegisteredAgent()}
        //can we add forProj here?  That should make a significant difference here.  
        HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setRequestMethod("POST");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.connect();
        DataOutputStream out = new DataOutputStream(connection.getOutputStream());
        out.writeBytes(parameter.toString());
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
        }
        catch (IOException ex){
            //Forward error response from RERUM
            System.out.println("Get from RERUM had trouble...");
            BufferedReader error = new BufferedReader(new InputStreamReader(connection.getErrorStream(),"utf-8"));
            String errorLine = "";
            
            while ((errorLine = error.readLine()) != null){  
                sb.append(errorLine);
            } 
            error.close();
            er = true;
            System.out.println(sb.toString());
        }
        connection.disconnect();
        //FIXME: Every now and then, this line throws an error: A JSONArray text must start with '[' at character 1 of &lt
        //I think this is the result of a 503 coming from the server, which needs investigation.
        String jarray = sb.toString();
        jarray = jarray.trim();
        JSONArray theLists = JSONArray.fromObject(jarray);
        JSONArray listsToReturn = new JSONArray();
        JSONObject masterList = new JSONObject();
        Date date4 = new Date();
        //System.out.println("Responded with lists at "+dateFormat.format(date4));
        //System.out.println("How many anno lists did I find for ~"+canvasID+"~ (v1)? "+theLists.size());
        
        Date date5 = new Date();
        //System.out.println("Start logic to pick correct list at "+dateFormat.format(date5));
        if(!er){
            for(int j=0; j<theLists.size(); j++){
                JSONObject v1ListToCheck = theLists.getJSONObject(j);
                /*
                System.out.println("Check v1 list "+(j+1)+" of "+theLists.size()+":"+listToCheck.getString("@id"));
                System.out.println("have isPartOf? "+listToCheck.has("isPartOf"));
                System.out.println("Get isPartOf? "+listToCheck.getString("isPartOf"));
                System.out.println(listToCheck.getString("isPartOf") == projectID);
                System.out.println("have __rerum? "+listToCheck.has("__rerum"));
                System.out.println("Empty next? "+listToCheck.getJSONObject("__rerum").getJSONObject("history").getJSONArray("next").isEmpty());
                System.out.println("Have generatedBy? "+listToCheck.has("generatedBy"));
                System.out.println("Generator match? "+listToCheck.getString("generatedBy").equals(man.getRegisteredAgent()));
                */
                //It is v1 now, check for the proper v1 keys and remember all lists from the history are returned.
                //The lists from v1 will never have isPartOf:"master", it will always be a string Integer.
                if(v1ListToCheck.has("isPartOf")){
                    if(Integer.parseInt(v1ListToCheck.getString("isPartOf")) == projectID){
                        if(v1ListToCheck.has("__rerum") && v1ListToCheck.getJSONObject("__rerum").getJSONObject("history").getJSONArray("next").isEmpty()
                                && v1ListToCheck.getJSONObject("__rerum").has("generatedBy") && v1ListToCheck.getJSONObject("__rerum").getString("generatedBy").equals(man.getRegisteredAgent())){
                            //This is a most recent version, but there could be multiple in a forking scenario.  Ensure this one belongs to TPEN_NL before considering it.
                            //System.out.println("TPEN_NL determined an anno list belonged by checking rerum history and matching generators");
                            v1ListToCheck.remove("_id");
                            listsToReturn.add(v1ListToCheck);
                        }
                        else if(v1ListToCheck.has("__rerum") && v1ListToCheck.getJSONObject("__rerum").getJSONObject("history").getJSONArray("next").size() > 0){
                            //This annotation list could have been forked and may still be the most recent.  Either one or none of the nextIDs belong to TPEN_NL
                            //if none, then this annotation should be considered because it is the most recent for TPEN_NL
                            //if one, then this annotation should be ignored because it is not the youngest for TPEN_NL
                            boolean consider = true;
                            for(int x=0; x<v1ListToCheck.getJSONObject("__rerum").getJSONObject("history").getJSONArray("next").size(); x++){
                                boolean agentPass = compareListAgent(v1ListToCheck.getJSONObject("__rerum").getJSONObject("history").getJSONArray("next").getString(x), man.getRegisteredAgent());
                                if(agentPass){
                                    consider = false;
                                }
                            }
                            if(consider){
                                //System.out.println("TPEN_NL determined an anno list belonged by checking rerum history and matching generators the hard way");
                                v1ListToCheck.remove("_id");
                                listsToReturn.add(v1ListToCheck);
                            }
                            else{
                                //System.out.println("TPEN_NL determined this list does not belong because we found a matching generator in a history.next entry.");
                            }
                        }
                        else{//This list is malformed.  isPartOf and/or generatedBy is missing, it must be ignored.  
                            System.out.println("The list detected does not seem to be formatted correctly for TPEN_NL, this could be an error 2...");
                        }
                    }
                }
                else{
                    System.out.println("The list detected does not seem to be formatted correctly for TPEN_NL, this could be an error 1...");
                }
            }
            //Then nothing from v1 is what we were looking for.  Check in v0.
            if(listsToReturn.isEmpty()){
                parameter.remove("__rerum.history.next");
                parameter.remove("__rerum.generatedBy");
                theLists = getFromV0(parameter);
                //System.out.println("How many anno lists did I find for ~"+canvasID+"~ (v0)? "+theLists.size());
                for(int k=0; k<theLists.size(); k++){
                    JSONObject v0ListToCheck = theLists.getJSONObject(k);
                    if(v0ListToCheck.has("isPartOf")){
                        if(v0ListToCheck.getString("isPartOf").equals("master")){
                            //We only add this as a list to return if none of the list found 
                            //matched with projectID (as backwards support for the oldest data)
                            v0ListToCheck.remove("_id");
                            masterList = v0ListToCheck;
                        }
                        else if(Integer.parseInt(v0ListToCheck.getString("isPartOf")) == projectID){
                            v0ListToCheck.remove("_id");
                            listsToReturn.add(v0ListToCheck);
                        }
                    }
                    else{
                        System.out.println("v0 list formatted incorrectly, this may be an error...");
                        //This is problem, ignore this one.  
                    }
                }
                //Backwards support for old anno lists having isPartOf:"master" instead of a project ID
                //We fix these as we find these and update back to the v0 object with isPartOf:""+projectID
                if(listsToReturn.isEmpty() && !masterList.isEmpty()){
                    //None of the master lists will have copiedFrom.  Only lists that were created as part of a copy (aka not master) have that.
                    //This should ensure it is a list that is safe to fix automatically.
                    if(!masterList.has("copiedFrom")){
                        masterList = fixV0MasterIssue(projectID, masterList);
                    }
                    listsToReturn.add(masterList);
                }
            }
        }
        //I believe this always inteds just to return one list based on the filtering above.
        Date date2 = new Date();
        //System.out.println("Finished list picking at "+dateFormat.format(date2));
        //System.out.println("How many total anno lists to return for ~"+canvasID+"~? "+listsToReturn.size());
        return listsToReturn;
    }
    
    private static JSONObject fixV0MasterIssue(int masterProjID, JSONObject masterList) throws MalformedURLException, IOException{
        masterList.element("isPartOf", ""+masterProjID);
        JSONObject newMasterList = masterList;
        JSONObject params = new JSONObject();
        params.element("isPartOf", ""+masterProjID);
        params.element("@id", masterList.getString("@id"));
        URL postUrl = new URL(Constant.OLD_ANNOTATION_SERVER_ADDR + "/anno/updateAnnotation.action");
        HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setRequestMethod("POST");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        connection.connect();
        DataOutputStream out = new DataOutputStream(connection.getOutputStream());
        //TODO value to save
        out.writeBytes("content=" + URLEncoder.encode(params.toString(), "utf-8"));
        out.flush();
        out.close(); // flush and close
        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
        String line="";
        StringBuilder sb = new StringBuilder();
        while ((line = reader.readLine()) != null){
            //line = new String(line.getBytes(), "utf-8");  
            //System.out.println(line);
            sb.append(line);
        }
        reader.close();
        connection.disconnect();
        return newMasterList;
    }
    
    /**
     * Determine whether an agent that created a given annotation list is the TPEN_NL agent
     * @param annoListURL an oa:AnnotationList @id
     * @param agentID an foaf:Agent @id
     * @return true if the annotationList agent is the TPEN_NL agent
     * @throws MalformedURLException
     * @throws IOException 
     */
    public static boolean compareListAgent(String annoListURL, String agentID) throws MalformedURLException, IOException{
        boolean agentsMatch = false;
        URL listURL = new URL(annoListURL);
        HttpURLConnection connection = (HttpURLConnection) listURL.openConnection();
        connection.setDoOutput(true);
        connection.setRequestMethod("GET");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.connect();
        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
        String line="";
        StringBuilder sb = new StringBuilder();
        while ((line = reader.readLine()) != null){
            line = new String(line.getBytes(), "utf-8");
            sb.append(line);
        }
        reader.close();
        connection.disconnect();
 
        String annoList = sb.toString();
        JSONObject annotationList = JSONObject.fromObject(annoList);
        if(annotationList.has("__rerum") && annotationList.getJSONObject("__rerum").has("generatedBy") && annotationList.getJSONObject("__rerum").getString("generatedBy").equals(agentID)){
            agentsMatch = true;
        }
        return agentsMatch;
    }
    
    /**
     * In the case that there were 0 annotation lists on a given canvas through the v1 API, check if the v0 API can find one or more and return them.
     * In the functions accepted the return, the item(s) returned will be brought into v1 so a v0 check doesn't have to happen again for the same item(s).
     * @param params The JSON request query for the v0 getAnnotationByProperties endpoint.
     * @return
     * @throws MalformedURLException
     * @throws IOException 
     */
    private static JSONArray getFromV0(JSONObject params) throws MalformedURLException, IOException{
        URL postUrl = new URL(Constant.OLD_ANNOTATION_SERVER_ADDR + "/anno/getAnnotationByProperties.action");
        JSONArray v0Objs = new JSONArray();
        HttpURLConnection connection = (HttpURLConnection) postUrl.openConnection();
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setRequestMethod("POST");
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        connection.connect();
        DataOutputStream out = new DataOutputStream(connection.getOutputStream());
        //value to save
        out.writeBytes("content="+URLEncoder.encode(params.toString(), "utf-8"));
        out.flush();
        out.close(); // flush and close
        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),"utf-8"));
        String line="";
        StringBuilder sb = new StringBuilder();
        while ((line = reader.readLine()) != null){
            line = new String(line.getBytes(), "utf-8");
            sb.append(line);
        }
        reader.close();
        connection.disconnect();      
        //FIXME: Every now and then, this line throws an error: A JSONArray text must start with '[' at character 1 of &lt
        String jarray = sb.toString();
        jarray = jarray.trim();
        v0Objs = JSONArray.fromObject(jarray);
        return v0Objs;
    }
}
