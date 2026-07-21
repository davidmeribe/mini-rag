import { searchDocuments } from '@/app/libs/pinecone';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  query: z.string().min(1),
  topK: z.number().optional().default(5),
});

export async function POST(request: NextRequest) {
 try{	
	const body = await request.json();
	const result = querySchema.safeParse(body);
     if (!result.success) {
           // return 400 error
		   return NextResponse.json(
			{ error: 'Query Validation Error' },
			{ status: 400 }
		);
     }
    const { query, topK } = result.data;

	const results = await searchDocuments(query, topK);

	const formattedResults = results.map((doc) => ({
		id: doc.id,
		score: doc.score,
		// Check both field names - 'text' is standard, 'content' is legacy
		content: doc.metadata?.text ?? doc.metadata?.content ?? '',
		source: doc.metadata?.source || 'unknown',
		chunkIndex: doc.metadata?.chunkIndex,
		totalChunks: doc.metadata?.totalChunks,
	}));

	return NextResponse.json({
		query,
		resultsCount: formattedResults.length,
		results: formattedResults,
		status: 200
	});
  }catch(error){
        console.error('Error searching documents:', error);
		return NextResponse.json(
			{ error: 'Failed to Search Pinecone documents' },
			{ status: 500 }
		);
  }
}
