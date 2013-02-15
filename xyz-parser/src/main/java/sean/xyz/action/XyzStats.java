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


public class XyzStats implements Action{
	
	
	public handleAction(String[] args) throws Exception{
		
		CommandLine commandLine = new PosixParser().parse(getOptions(), args);
		String xyzFile = commandLine.getOptionValue(IN_OPTION);
		String threads = commandLine.getOptionValue(THREADS_OPTION);
		
		int threads = (commandLine.getOptionValue(THREADS_OPTION)) ? 
			Integer.parseInt(commandLine.getOptionValue(THREADS_OPTION)) : DEFAULT_THREADS;
			
		StringBuffer report = new StringBuffer(DIV);
		
		ExecutorService executor = Executors.newFixedThreadPool(threads);
		List<Future<String>> futures = new ArrayList<Future<String>>();	
		
		long startTime = System.currentTimeMillis();
		
		futures.add(executor.submit(new StatsCalculator(xyzFile, delim)));
		
		boolean done = false;
		while (!done){
			done = true;
			for(Future<String> f : futures){
				try{
					String result = f.get(1000, TimeUnit.MILLISECONDS);
					report.append(result);
					System.out.println(result);
				}catch(Exception e){
					done = false;
					System.out.print("\rrunning (" + (System.currentTimeMillis() - startTime) / 1000 +" seconds )");
				}
			}
		}
		
		executor.shutdownNow();
		System.out.println(report.toString());
		
		System.out.println ("COMEPLETE : (" + (System.currentTimeMillis() - startTime) / 1000 +" seconds )");
		
	}
	
	
	private class StatsCalculator implements Callable<String> {
		
		public static final String MSG = "Calculating the bounds of the point cloud";
		String xyzFile, delim;
		
		
		public StatsCalculator(xyzFile){
			this.xyzFile = xyzFile;
		}
		
		
		public void call(){
			
			try{

				BufferedReader bufferedReader = new BufferedReader(new FileReader(xyzFile));

				int lnCount = 0;
				int totalLineCount = 0;

				String ln;
                
		        while ((ln = bufferedReader.readLine()) != null && lnCount < maxLines) {
					
					lnCount++;
					String[] parts = ln.split(delim);
					
					double x, y, z;
					
					
				
				}
				

			}catch(Exception e){
				e.printStackTrace();
			}			
		}

		
	}
	
	
	
	
	
}