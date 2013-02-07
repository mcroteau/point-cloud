package sean.xyz.action;


import org.apache.commons.cli.MissingOptionException;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.OptionBuilder;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.PosixParser;
import org.apache.commons.io.FilenameUtils;

import org.codehaus.jackson.JsonEncoding;
import org.codehaus.jackson.JsonFactory;
import org.codehaus.jackson.JsonGenerator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

import java.util.List;

import sean.xyz.action.Action;



public class XyzToGeoJson implements Action{
	
	private static Options options = new Options();
	
	public static Options getOptions(){
		options.addOption(OptionBuilder.withLongOpt(Constants.IN_OPTION)
				.hasArg()
				.isRequired()
				.create()
			 ).addOption(OptionBuilder.withLongOpt(Constants.OUT_OPTION)
				.hasArg()
				.isRequired()
				.create()
			 ).addOption(OptionBuilder.withLongOpt(Constants.MAX_LINES_OPTION)
			 	.hasArg()
			 	.isRequired()
			 	.create()
			 ).addOption(OptionBuilder.withLongOpt(Constants.PARTS_OPTION)
			   	.hasArg()
			   	.create()
			 ).addOption(OptionBuilder.withLongOpt(Constants.SKIP_OPTION)
			 	.hasArg()
			 	.create()
			 ).addOption(OptionBuilder.withLongOpt(Constants.DELIM_OPTION)
			   	.hasArg()
			   	.create()
			 );
		return options;
	}
	
	
	public void handleAction(String[] arguments) throws Exception{
		
		try{
			
			CommandLineParser parser = new PosixParser();
			CommandLine commandLine = parser.parse( getOptions(), arguments );
			
			File inFile = new File(commandLine.getOptionValue(Constants.IN_OPTION));
			String outFilename = commandLine.getOptionValue(Constants.OUT_OPTION);
			File outFile = new File(outFilename);
			
			int maxLines = Integer.parseInt(commandLine.getOptionValue(Constants.MAX_LINES_OPTION));
			
			String delim = (commandLine.hasOption(Constants.DELIM_OPTION)) ? commandLine.getOptionValue(Constants.DELIM_OPTION) : " ";
			
			int parts = (commandLine.hasOption(Constants.PARTS_OPTION)) ? Integer.parseInt(commandLine.getOptionValue(Constants.PARTS_OPTION)) : 1;
			parts = (parts < 1) ? 1 : parts;
			
			int skip = (commandLine.hasOption(Constants.SKIP_OPTION)) ? Integer.parseInt(commandLine.getOptionValue(Constants.SKIP_OPTION)) : 1;
			skip = (parts < 1) ? 1 : skip;
			
			String[] fileNames = new String[parts];
			
			if(parts <= 1){
				fileNames[0] = outFilename;
			}else{
				String basePath = FilenameUtils.removeExtension(outFilename);
				String extension = FilenameUtils.getExtension(outFilename);
				for(int j = 0; j < parts; j++){
					fileNames[j] = basePath + j + "." + extension;
				}
			}
			
			BufferedReader bufferedReader = new BufferedReader(new FileReader(inFile));
			
			
			
			int lnCount = 0;
			int totalLineCount = 0;
			int linesPerFile = maxLines / parts;
			
			for(String fileName : fileNames){
				lnCount = 0;
				String ln;
					
			    JsonFactory jf = new JsonFactory();
			    JsonGenerator jg = jf.createJsonGenerator(new File(fileName), JsonEncoding.UTF8);
		        GeoJson.startFeatureCollection(jg);
		        GeoJson.startFeatures(jg);
			    
	            while ((ln = bufferedReader.readLine()) != null && lnCount < linesPerFile) {
	                GeoJson.addFeature(jg, ln);
	                lnCount++;
	                System.out.print("\r" + (linesPerFile - lnCount));
	            }
	
				GeoJson.endFeatures(jg);
				GeoJson.endFeatureCollection(jg);
				jg.flush();
				jg.close();
				
				totalLineCount += lnCount;
				System.out.println("\n\n " + lnCount + " lines processed for file " + fileName);
				
			}
			
            bufferedReader.close();
            System.out.println("\n.............\n" + totalLineCount/skip + " total lines processed\n");
			
			
		}catch(MissingOptionException me){
			List<Option> missingOptions = me.getMissingOptions();
			System.out.println("Missing " + missingOptions.size() +  " options");
			
			for(int m = 0; m < missingOptions.size(); m++){
				System.out.println("-" + missingOptions.get(m));
			}
			
		}catch(Exception e){
			e.printStackTrace();
		}
	}
	
	
	private static class Constants {
		
		public static String IN_OPTION = "in";
		public static String OUT_OPTION = "out";
		public static String MAX_LINES_OPTION = "max";
		public static String DELIM_OPTION = "delim";
		public static String PARTS_OPTION = "parts";
		public static String SKIP_OPTION = "skip";


        public static final String type = "type";
        public static final String FeatureCollection = "FeatureCollection";
        public static final String features = "features";
        public static final String Feature = "Feature";
        public static final String geometry = "geometry";
        public static final String Point = "Point";
        public static final String coordinates = "coordinates";
        public static final String properties = "properties";
        public static final String Classification = "Classification";
        public static final String Intensity = "Intensity";
        public static final String PointSourceId = "PointSourceId";
        public static final String X = "X", Y = "Y", Z = "Z", Red = "Red", Green = "Green", Blue = "Blue";
    }
    

	
    private static class GeoJson {

        public static void startFeatureCollection(JsonGenerator jg) throws IOException {
            jg.writeStartObject();
            jg.writeFieldName(Constants.type);
            jg.writeString(Constants.FeatureCollection);
        }

        public static void endFeatureCollection(JsonGenerator jg) throws IOException {
            jg.writeEndObject();
        }

        public static void startFeatures(JsonGenerator jg) throws IOException {
            jg.writeFieldName(Constants.features);
            jg.writeStartArray();
        }

        public static void endFeatures(JsonGenerator jg) throws IOException {
            jg.writeEndArray();
        }

        public static void addFeature(JsonGenerator jg, String line) throws IOException {
            jg.writeStartObject();
            jg.writeFieldName(Constants.type);
            jg.writeString(Constants.Feature);
            addGeometry(jg, line);
            addProperties(jg, line);
            jg.writeEndObject();
        }

        public static void addGeometry(JsonGenerator jg, String line) throws IOException {
            jg.writeFieldName(Constants.geometry);
            jg.writeStartObject();
            jg.writeFieldName(Constants.type);
            jg.writeString(Constants.Point);
            addCoordinates(jg, line);
            jg.writeEndObject();
        }

        public static void addCoordinates(JsonGenerator jg, String line) throws IOException {
            jg.writeFieldName(Constants.coordinates);
            jg.writeStartArray();
            String[] parts = line.split(",");
            if (parts.length > 1) {
                jg.writeNumber(parts[0]);
                jg.writeNumber(parts[1]);
                jg.writeNumber(parts[2]);
            }
            jg.writeEndArray();
        }

        public static void addProperties(JsonGenerator jg, String line) throws IOException {
            jg.writeFieldName(Constants.properties);
            jg.writeStartObject();
            String[] parts = line.split(",");
            if (parts.length == 3) {
                jg.writeFieldName(Constants.X);
                jg.writeString(parts[0]);

                jg.writeFieldName(Constants.Y);
                jg.writeString(parts[1]);

                jg.writeFieldName(Constants.Z);
                jg.writeString(parts[2]);
            }

            jg.writeFieldName(Constants.Red);
            jg.writeString("106");

            jg.writeFieldName(Constants.Green);
            jg.writeString("130");

            jg.writeFieldName(Constants.Blue);
            jg.writeString("103");

            jg.writeFieldName(Constants.Classification);
            jg.writeString("2");

            jg.writeFieldName(Constants.Intensity);
            jg.writeNumber("1");

            jg.writeFieldName(Constants.PointSourceId);
            jg.writeString("1");

            jg.writeEndObject();
        }
    }	
}