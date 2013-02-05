package sean.xyz;

import org.codehaus.jackson.JsonEncoding;
import org.codehaus.jackson.JsonFactory;
import org.codehaus.jackson.JsonGenerator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

public class Main {

    public Main(File inFile, File outFile, int maxLines) throws Exception {
        BufferedReader in = new BufferedReader(new FileReader(inFile));
        JsonFactory jf = new JsonFactory();
        JsonGenerator jg = jf.createJsonGenerator(outFile, JsonEncoding.UTF8);
        int lnCount = 0;
        try {
            String ln;
            GeoJson.startFeatureCollection(jg);
            GeoJson.startFeatures(jg);

            while ((ln = in.readLine()) != null && lnCount < maxLines) {
                GeoJson.addFeature(jg, ln);
                lnCount++;
                System.out.print("\r" + (maxLines - lnCount));
            }
        } finally {
            GeoJson.endFeatures(jg);
            GeoJson.endFeatureCollection(jg);
            in.close();
            jg.flush();
            jg.close();
            System.out.println("\n.............\n" + lnCount + " lines processed\n");
        }
    }

    public static void main(String[] args) throws Exception {
        String inPath = args[0];
        String outPath = args[1];
        Integer maxLines = Integer.parseInt(args[2]);
        try {
            new Main(new File(inPath), new File(outPath), maxLines);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static class Constants {
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
