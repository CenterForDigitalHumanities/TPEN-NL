/*
 * Copyright 2013-2014 Saint Louis University. Licensed under the
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
package edu.slu.tpen.transfer;

import java.awt.Dimension;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.slu.tpen.entity.Image.Canvas;
import edu.slu.tpen.servlet.Constant;
import imageLines.ImageCache;
import textdisplay.Folio;
import textdisplay.Project;
import user.User;
import static edu.slu.util.LangUtils.buildQuickMap;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import net.sf.json.JSONArray;
import tokens.TokenManager;

/**
 * Class which manages serialisation to JSON-LD. Builds a Map containing the
 * Project's data, and then uses Jackson to serialise it as JSON.
 *
 * @author tarkvara
 */
public class JsonLDExporter {

   /**
    * Holds data which will be serialised to JSON.
    */
   Map<String, Object> manifestData;

   /**
    * Populate a map which will contain all the relevant project information.
    *
    * @param proj the project to be exported.
    * @throws SQLException
    */
   public JsonLDExporter(Project proj, User u) throws SQLException, IOException {
      Folio[] folios = proj.getFolios();
      TokenManager man = new TokenManager();
      Date date2 = new Date();
      DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss.SSS");
      //System.out.println(System.lineSeparator());
      //System.out.println("***********************************");
      //System.out.println("Back end has been told to export manifest "+proj.getProjectID()+" at "+dateFormat.format(date2));
      try {
         //System.out.println("Using SERVERURL to build name.  What is value: "+man.getProperties().getProperty("SERVERURL"));
         String projName = man.getProperties().getProperty("SERVERURL") + proj.getProjectName();
         //System.out.println("What is the project name in exporter: "+projName);
         String[] supportedContexts = new String[3];
         supportedContexts[0] = "http://store.rerum.io/v1/context.json";
         supportedContexts[1] = "http://www.w3.org/ns/anno.jsonld";
         supportedContexts[2] = "http://iiif.io/api/presentation/2/context.json";
         manifestData = new LinkedHashMap<>();
         manifestData.put("@context", supportedContexts);
         manifestData.put("@id", projName + "/manifest.json");
         manifestData.put("@type", "sc:Manifest");
         manifestData.put("label", proj.getProjectName());

         Map<String, Object> pages = new LinkedHashMap<>();
         pages.put("@id", projName + "/sequence/normal");
         pages.put("@type", "sc:Sequence");
         pages.put("label", "Current Page Order");

         List<Map<String, Object>> pageList = new ArrayList<>();
         for (Folio f : folios) {
            pageList.add(buildPage(proj.getProjectID(), projName, f, u, man));
         }
         pages.put("canvases", pageList);
         manifestData.put("sequences", new Object[] { pages });
         Date date3 = new Date();
         //System.out.println("Back end has finished building manifest "+proj.getProjectID()+" at "+dateFormat.format(date3)+".  It took "+getDateDiff(date2,date3,TimeUnit.SECONDS)+" seconds");
         //System.out.println("***********************************");
         //System.out.println(System.lineSeparator());
      } 
      catch (UnsupportedEncodingException ignored){
          
      }
   }

   public String export() throws JsonProcessingException {
      ObjectMapper mapper = new ObjectMapper();
      return mapper.writer().withDefaultPrettyPrinter().writeValueAsString(manifestData);
   }
   
        /**
      * Get a diff between two dates
      * @param date1 the oldest date
      * @param date2 the newest date
      * @param timeUnit the unit in which you want the diff
      * @return the diff value, in the provided unit
      */
     public static long getDateDiff(Date date1, Date date2, TimeUnit timeUnit) {
         long diffInMillies = date2.getTime() - date1.getTime();
         return timeUnit.convert(diffInMillies,TimeUnit.MILLISECONDS);
     }

   /**
    * Get the map which contains the serialisable information for the given
    * page.
    *
    * @param f the folio to be exported
    * @return a map containing the relevant info, suitable for Jackson
    * serialisation
    */
   private Map<String, Object> buildPage(int projID, String projName, Folio f, User u, TokenManager man) throws SQLException, IOException {
       /*
        System.out.println("Exporter building canvas.  Here are its params");
        System.out.println("projectID: "+ projID);
        System.out.println("projName: "+projName);
        System.out.println("Folio Page Name: "+ URLEncoder.encode(f.getPageName(), "UTF-8"));
        System.out.println("Folio Number: "+f.getFolioNumber());
        System.out.println("Folio Number: "+f.getFolioNumber());
        System.out.println("Folio URL Resize: "+f.getImageURLResize());
       */
        
        //String canvasID = man.getProperties().getProperty("PALEO_CANVAS_ID_PREFIX") + f.getImageURL().replaceAll("^.*(paleography[^/]+).*$", "$1"); //for paleo dev and prod
        String canvasID = projName + "/canvas/" + URLEncoder.encode(f.getPageName(), "UTF-8"); //For SLU testing    
        
        DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss.SSS");
        Date date = new Date();
        ///System.out.println(System.lineSeparator());
        ///System.out.println("==============================================");
        ///System.out.println("build page for "+f.getPageName()+" at "+dateFormat.format(date));
        Dimension pageDim = ImageCache.getImageDimension(f.getFolioNumber());
        if (pageDim == null) {
           LOG.log(Level.INFO, "Image for {0} not found in cache, loading image...", f.getFolioNumber());
           pageDim = f.getImageDimension();
        }
        Date date3 = new Date();
        //System.out.println("++++++++++++++++++++++++++++++++++");
        //System.out.println("It took "+getDateDiff(date,date3,TimeUnit.SECONDS)+" seconds to get the image dimensions for this page");
        Map<String, Object> result = new LinkedHashMap<>();
        List<Object> images = new ArrayList<>();
        result.put("@id", canvasID);
        result.put("@type", "sc:Canvas");
        result.put("label", f.getPageName());

        int canvasHeight = 1000;
        result.put("height", canvasHeight);

        if (pageDim != null) {
           int canvasWidth = pageDim.width * canvasHeight / pageDim.height;  // Convert to canvas coordinates.
           result.put("width", canvasWidth);
        }
        List<Object> resources = new ArrayList<>();
        Map<String, Object> imageAnnot = new LinkedHashMap<>();
        imageAnnot.put("@type", "oa:Annotation");
        imageAnnot.put("motivation", "sc:painting");
        Map<String, Object> imageResource = buildQuickMap("@id", f.getImageURLResize(f.getImageURL(), 2000), "@type", "dctypes:Image", "format", "image/jpeg"); //For SLU testing
        //Map<String, Object> imageResource = buildQuickMap("@id", String.format("%s%s&user=%s", man.getProperties().getProperty("SERVERURL"), f.getImageURLResize(), u.getUname()), "@type", "dctypes:Image", "format", "image/jpeg");
        //LOG.log(Level.INFO, "pageDim={0}", pageDim);
  //      imageResource.put("iiif", ?);
        if (pageDim != null) {
           imageResource.put("height", pageDim.height);
           imageResource.put("width", pageDim.width);
        }
        imageAnnot.put("resource", imageResource);

        imageAnnot.put("on", canvasID);
        images.add(imageAnnot);
        resources.add(imageAnnot);

        JSONArray otherContent = new JSONArray();
        Date date4 = new Date();
        otherContent = Canvas.getAnnotationListsForProject(projID, canvasID, u.getUID(), man);
        Date date5 = new Date();
        //System.out.println("++++++++++++++++++++++++++++++++++");
        //System.out.println("It took "+getDateDiff(date4,date5,TimeUnit.SECONDS)+" seconds to get the list for this page");
        //result.put("resources", resources);
        result.put("otherContent", otherContent);
        result.put("images", images);
        Date date2 = new Date();
       //System.out.println("Finished build page for "+f.getPageName()+" at "+dateFormat.format(date2)+".  It took "+getDateDiff(date,date2,TimeUnit.SECONDS)+" seconds");
        //System.out.println("==============================================");
        //System.out.println(System.lineSeparator());
        return result;
   }

   private static final Logger LOG = Logger.getLogger(JsonLDExporter.class.getName());
}
        
