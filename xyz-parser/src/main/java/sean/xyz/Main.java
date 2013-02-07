package sean.xyz;

import org.codehaus.jackson.JsonEncoding;
import org.codehaus.jackson.JsonFactory;
import org.codehaus.jackson.JsonGenerator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

import sean.xyz.action.Action;
import sean.xyz.action.XyzToGeoJson;

public class Main {

	private static final String GEOJSON_ACTION = "geojson";

    public static void main(String[] args) throws Exception {
	
        try {
    
			if(args.length < 1)
				System.out.print("Must specify action : geojson");
				
			String actionName = args[0];
			Action action = null;
			
			if(actionName.equals(GEOJSON_ACTION)){
				action = new XyzToGeoJson();
			}

			if(action != null){
				action.handleAction(args);
			}else{
				System.out.print("Action did not match : geojson");
			}
    	} catch (Exception e) {
            e.printStackTrace();
        }
    }

   
}
