export type Chunk = {
	id: string;
	content: string;
	metadata: {
		source: string;
		chunkIndex: number;
		totalChunks: number;
		startChar: number;
		endChar: number;
		[key: string]: string | number | boolean | string[];
	};
};

/**
 * Sanitizes raw scraped web content before chunking.
 * Strips HTML, normalizes whitespace, handles special characters,
 * and removes common boilerplate patterns.
 */
export function sanitizeText(text: string): string {
	let sanitized = text;
 
	// 1. Strip HTML tags
	sanitized = sanitized.replace(/<[^>]*>/g, ' ');
 
	// 2. Decode common HTML entities
	sanitized = sanitized
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ');
 
	// 3. Normalize smart quotes and special punctuation
	sanitized = sanitized
		.replace(/[\u2018\u2019]/g, "'")   // smart single quotes
		.replace(/[\u201C\u201D]/g, '"')   // smart double quotes
		.replace(/\u2014/g, ' - ')          // em dash
		.replace(/\u2013/g, ' - ')          // en dash
		.replace(/\u2026/g, '...')          // ellipsis
		.replace(/\u00A0/g, ' ');           // non-breaking space
 
	// 4. Remove boilerplate patterns
	sanitized = sanitized
		.replace(/click here( to [^\n.]+)?/gi, '')
		.replace(/skip to (main )?content/gi, '')
		.replace(/cookie policy/gi, '')
		.replace(/privacy policy/gi, '')
		.replace(/terms (of (use|service))?/gi, '')
		.replace(/all rights reserved/gi, '')
		.replace(/copyright ©?[\d\s]*/gi, '')
		.replace(/subscribe to (our )?(newsletter|updates)/gi, '')
		.replace(/follow us on [^\n.]*/gi, '');
 
	// 5. Normalize whitespace — collapse multiple spaces/tabs/newlines
	sanitized = sanitized
		.replace(/\t/g, ' ')
		.replace(/[ ]{2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
 
	return sanitized;
}


/**
 * Splits text into smaller chunks for processing
 * @param text The text to chunk
 * @param chunkSize Maximum size of each chunk
 * @param overlap Number of characters to overlap between chunks
 * @param source Source identifier (typically URL)
 * @returns Array of text chunks
 */
export function chunkText(
	text: string,
	chunkSize: number = 500,
	overlap: number = 50,
	source: string = 'unknown'
): Chunk[] {

	// Sanitize before chunking
	const cleanText = sanitizeText(text);
	const chunks: Chunk[] = [];
	const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);

	let currentChunk = '';
	let chunkStart = 0;
	let chunkIndex = 0;

	for (let i = 0; i < sentences.length; i++) {
		const sentence = sentences[i].trim() + '.';

		// If adding this sentence would exceed chunk size, create a chunk
		if (
			currentChunk.length + sentence.length > chunkSize &&
			currentChunk.length > 0
		) {
			const chunk: Chunk = {
				id: `${source}-chunk-${chunkIndex}`,
				content: currentChunk.trim(),
				metadata: {
					source,
					chunkIndex,
					totalChunks: 0, // Will be updated later
					startChar: chunkStart,
					endChar: chunkStart + currentChunk.length,
				},
			};

			chunks.push(chunk);

			// Start new chunk with overlap
			const overlapText = getLastWords(currentChunk, overlap);
			currentChunk = overlapText + ' ' + sentence;
			chunkStart = chunk.metadata.endChar - overlapText.length;
			chunkIndex++;
		} else {
			currentChunk += (currentChunk ? ' ' : '') + sentence;
		}
	}

	// Add final chunk if it has content
	if (currentChunk.trim()) {
		chunks.push({
			id: `${source}-chunk-${chunkIndex}`,
			content: currentChunk.trim(),
			metadata: {
				source,
				chunkIndex,
				totalChunks: 0,
				startChar: chunkStart,
				endChar: chunkStart + currentChunk.length,
			},
		});
	}

	// Update total chunks count
	chunks.forEach((chunk) => {
		chunk.metadata.totalChunks = chunks.length;
	});

	return chunks;
}

/**
 * Gets the last N characters worth of words from a text
 *
 * This is used to create overlap between chunks. We want complete words,
 * not cut-off characters, so we work backwards from the end.
 *
 * @param text The source text
 * @param maxLength Maximum length to return
 * @returns The last words up to maxLength
 *
 * @example
 * getLastWords("React Hooks are awesome", 10)
 * // Returns: "are awesome" (10 chars)
 * // NOT: "re awesome" (cut off "are")
 *

 *
 * Requirements:
 * 1. If text is shorter than maxLength, return the whole text
 * 2. Otherwise, return the last maxLength characters worth of COMPLETE words
 * 3. Build the result backwards to ensure you get the last words
 *
 * Steps:
 * 1. Check if text.length <= maxLength, if so return text
 * 2. Split text into words using .split(' ')
 * 3. Start with empty result string
 * 4. Loop through words BACKWARDS (from end to start)
 * 5. For each word, check if adding it would exceed maxLength
 * 6. If it would exceed, break the loop
 * 7. Otherwise, prepend the word to result (word + ' ' + result)
 * 8. Return the result
 */
function getLastWords(text: string, maxLength: number): string {
	// TODO: Implement this function!
	// YOUR CODE HERE
	let result = '';
	if (text.length <= maxLength) {
		return text;
	}
    
	const words = text.split(' ');

	for (let i =(words.length -1); i >=0 ; i--){
         if (result.length + words[i].length +1 > maxLength){
			break;
		 }
		 else{
			result = words[i] + ' ' + result;
		 }
	}

	return result;
}
