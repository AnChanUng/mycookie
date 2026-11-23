package com.csstudy.backend.chatbot;

import java.util.*;
import java.util.regex.Pattern;

public final class HybridIndex {
    public record Chunk(String source, String title, String url, String text) {}
    private record Posting(int index, int count) {}
    private final List<Chunk> chunks;
    private final Map<String,List<Posting>> postings = new HashMap<>();
    private final int[] lengths;
    private final double average;
    private final float[][] vectors;
    private static final Pattern WORD = Pattern.compile("[가-힣]+|[a-z0-9]+");
    public HybridIndex(List<Chunk> chunks, float[][] vectors) {
        this.chunks = List.copyOf(chunks);
        this.vectors = vectors;
        lengths = new int[chunks.size()];
        for (int i=0; i<chunks.size(); i++) {
            var counts = tokens(chunks.get(i).title()+" "+chunks.get(i).text());
            for (var term : counts.entrySet()) {
                postings.computeIfAbsent(term.getKey(), k -> new ArrayList<>()).add(new Posting(i,term.getValue()));
                lengths[i] += term.getValue();
            }
        }
        average = Arrays.stream(lengths).average().orElse(1);
    }
    private static Map<String,Integer> tokens(String text) {
        var counts = new HashMap<String,Integer>();
        var words = WORD.matcher(text.toLowerCase(Locale.ROOT));
        while (words.find()) {
            String w = words.group();
            if (w.charAt(0) >= '가' && w.length()>1) {
                for (int p=1;p<w.length();p++) counts.merge(w.substring(p-1,p+1),1,Integer::sum);
            } else counts.merge(w,1,Integer::sum);
        }
        return counts;
    }
    private static void fuse(double[] scores,double[] fused) {
        var ranked = new ArrayList<Integer>();
        for (int i=0;i<scores.length;i++) if(scores[i]>0) ranked.add(i);
        ranked.sort(Comparator.comparingDouble((Integer i)->scores[i]).reversed());
        for(int rank=0;rank<Math.min(20,ranked.size());rank++) fused[ranked.get(rank)] += 1.0/(61+rank);
    }
    // All vectors are unit-normalized by GeminiClient.
    public List<Chunk> search(String question,float[] query) {
        int n = chunks.size();
        double[] bm = new double[n], semantic = new double[n], fused = new double[n];
        for (String term : tokens(question).keySet()) {
            var list = postings.get(term);
            if(list==null) continue;
            double idf = Math.log1p((n-list.size()+0.5)/(list.size()+0.5));
            for(var p:list) bm[p.index] += idf*p.count*2.2/(p.count+1.2*(0.25+0.75*lengths[p.index]/average));
        }
        if(query!=null) for(int i=0;i<n;i++) {
            if(vectors[i]==null) continue;
            for(int j=0;j<query.length;j++) semantic[i]+=query[j]*vectors[i][j];
        }
        fuse(bm,fused);
        fuse(semantic,fused);
        var ranked = new ArrayList<Integer>();
        for(int i=0;i<n;i++) if(fused[i]>0) ranked.add(i);
        ranked.sort(Comparator.comparingDouble((Integer i)->fused[i]).reversed());
        var sources = new LinkedHashMap<String,Chunk>();
        for(int i:ranked) {
            Chunk chunk = chunks.get(i);
            sources.putIfAbsent(chunk.source(),chunk);
            if(sources.size()==5) break;
        }
        return List.copyOf(sources.values());
    }
}
