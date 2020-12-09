/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package edu.slu.tpen.servlet.util;

import edu.slu.tpen.servlet.Constant;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;

/**
 *
 * @author hanyan
 */
public class CreateAnnoListUtil {
    public static JSONObject createAnnoList(Integer projectID, String canvasID, String testingFlag, JSONArray resource, int uID, String localName){
        JSONObject canvasList = new JSONObject();
        canvasList.element("@type", "sc:AnnotationList");
        canvasList.element("on", canvasID);
        canvasList.element("resources", resource);
        canvasList.element("isPartOf", ""+projectID);
        canvasList.element("@context", Constant.RERUM_CONTEXT);
        canvasList.element("oa:createdBy", localName + "/" + uID);
        canvasList.element("TPEN_NL_TESTING", testingFlag);
        return canvasList;
    }
}
