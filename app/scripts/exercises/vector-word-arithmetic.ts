/**
 * VECTOR WORD ARITHMETIC EXERCISE
 *
 * This exercise demonstrates how vector addition and subtraction can reveal
 * semantic relationships between words. Think of it as "word math"!
 *
 * Famous example: king - man + woman ≈ queen
 *
 * Run this script with: yarn exercise:word-math
 */

import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';


// Load environment variables
const rootDir = path.resolve(__dirname, '../../..');
const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');

if (fs.existsSync(envLocalPath)) {
	dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
	dotenv.config({ path: envPath });
} else {
	dotenv.config();
}

import { openaiClient } from '../../libs/openai/openai';

// Load embeddings cache
let embeddingsCache: Record<string, number[]> = {};
try {
	const cachePath = path.join(__dirname, '../../../embeddings-cache.json');
	if (fs.existsSync(cachePath)) {
		embeddingsCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
		console.log('✅ Loaded embeddings cache from file');
	}
} catch (error: unknown) {
	console.log('⚠️  Error loading embeddings cache:', error);
	console.log('⚠️  No embeddings cache found, will use OpenAI API');
}
//=======================================================
// To used an Embeddings cache so it doesn't go through 10k retrieving their embeddings one by one
// Please you need to run the generateAndSaveEmbeddings().catch(console.error); at the end of this file comment out the 
// demonstrate method.
let embeddings_exercise: Record<string, number[]> = {};

try {
	const cachePath = path.join(__dirname, '../../../word-embeddings.json');
	if (fs.existsSync(cachePath)) {
		embeddings_exercise = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
		console.log('✅ Loaded embeddings cache from file');
	}
} catch (err) {
  console.error('Failed to load second embeddings cache. Have you run the generate script?');
   console.log('⚠️  Error loading second embeddings cache:', err);
  console.log('⚠️  No embeddings cache found, will use OpenAI API');
}
  
//==========================================================
// get vocabulary for my exercise
let vocabulary: string[] = [];
try {
   vocabulary = fs.readFileSync(path.join(__dirname, '../../../wordlist.txt'), 'utf-8')
    .split('\n')
    .map(w => w.trim())
    .filter(Boolean);
}
catch(err){
  console.error('Failed to load wordlist. Is wordlist.txt in the project root?');
}

//========================================================
//Generate embeddings for common words to use for my own generated exercises.
async function generateAndSaveEmbeddings() {
  const embeddings: Record<string, number[]> = {};
  const wordList = [ ...new Set(fs.readFileSync('./wordlist.txt', 'utf-8')
    .split('\n')
    .map(w => w.trim())
    .filter(Boolean))];

  const batchSize = 500;

  for (let i = 0; i < wordList.length; i += batchSize) {
    const batch = wordList.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(wordList.length / batchSize)}...`);

    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
      dimensions: 512,
    });

    response.data.forEach((item, index) => {
      embeddings[batch[index]] = item.embedding;
    });
  }

  fs.writeFileSync('./word-embeddings.json', JSON.stringify(embeddings, null, 2));
  console.log('Done! Embeddings saved to word-embeddings.json');
}

//==============================================================

// Vector operations
function addVectors(a: number[], b: number[]): number[] {
	return a.map((val, i) => val + b[i]);
}

function subtractVectors(a: number[], b: number[]): number[] {
	return a.map((val, i) => val - b[i]);
}

function cosineSimilarity(a: number[], b: number[]): number {
	const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
	const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
	const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
	return dotProduct / (magA * magB);
}

// Get embedding for a word/phrase
async function getEmbedding(text: string): Promise<number[]> {
	// Check cache first
	if (embeddingsCache[text]) {
		return embeddingsCache[text];
	}
	//Check my own cache second
	if (embeddings_exercise[text]){
		return embeddings_exercise[text];
	}

	console.log(`⚠️  Word "${text}" not in cache, fetching from OpenAI API...`);
	const response = await openaiClient.embeddings.create({
		model: 'text-embedding-3-small',
		dimensions: 512,
		input: text,
	});
	return response.data[0].embedding;
}

// Find the closest word from a list given a target vector
async function findClosestWord(
	targetVector: number[],
	candidates: string[]
): Promise<{ word: string; similarity: number }[]> {
	const results: { word: string; similarity: number }[] = [];

	for (const candidate of candidates) {
		const embedding = await getEmbedding(candidate);
		const similarity = cosineSimilarity(targetVector, embedding);
		results.push({ word: candidate, similarity });
	}

	return results.sort((a, b) => b.similarity - a.similarity);
}

async function demonstrateWordArithmetic() {
	console.log('🧮 VECTOR WORD ARITHMETIC DEMONSTRATIONS');
	console.log('=========================================\n');

	// Example 1: Classic King-Queen relationship
	console.log('📚 CLASSIC EXAMPLE: Gender Relations');
	console.log('Formula: king - man + woman ≈ ?');

	const [kingVec, manVec, womanVec] = await Promise.all([
		getEmbedding('king'),
		getEmbedding('man'),
		getEmbedding('woman'),
	]);

	const result1 = addVectors(subtractVectors(kingVec, manVec), womanVec);
	const candidates1 = [
		'queen',
		'princess',
		'empress',
		'lady',
		'ruler',
		'monarch',
		'pizza', // obviously wrong - should have low similarity
	];
	const matches1 = await findClosestWord(result1, candidates1);

	console.log('Top matches:');
	matches1.forEach((match, i) => {
		const emoji = i === matches1.length - 1 ? '❌' : '✅';
		console.log(
			`${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
				3
			)})`
		);
	});
	console.log('');

	// Example 2: Spicy relationship dynamics
	console.log('🔥 SPICY EXAMPLE: Relationship Dynamics');
	console.log('Formula: boyfriend - commitment + freedom ≈ ?');

	const [boyfriendVec, commitmentVec, freedomVec] = await Promise.all([
		getEmbedding('boyfriend'),
		getEmbedding('commitment'),
		getEmbedding('freedom'),
	]);

	const result2 = addVectors(
		subtractVectors(boyfriendVec, commitmentVec),
		freedomVec
	);
	const candidates2 = [
		'fuckboy',
		'player',
		'bachelor',
		'single',
		'flirt',
		'hookup',
		'accountant', // obviously wrong - should have low similarity
	];
	const matches2 = await findClosestWord(result2, candidates2);

	console.log('Top matches:');
	matches2.forEach((match, i) => {
		const emoji = i === matches2.length - 1 ? '❌' : '✅';
		console.log(
			`${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
				3
			)})`
		);
	});
	console.log('');

	// Example 3: Tech bro transformation
	console.log('💻 TECH BRO EXAMPLE: Silicon Valley Transformation');
	console.log('Formula: engineer - humility + ego ≈ ?');

	const [engineerVec, humilityVec, egoVec] = await Promise.all([
		getEmbedding('engineer'),
		getEmbedding('humility'),
		getEmbedding('ego'),
	]);

	const result3 = addVectors(
		subtractVectors(engineerVec, humilityVec),
		egoVec
	);
	const candidates3 = [
		'founder',
		'CEO',
		'entrepreneur',
		'startup',
		'techbro',
		'disruptor',
		'banana', // obviously wrong - should have low similarity
	];
	const matches3 = await findClosestWord(result3, candidates3);

	console.log('Top matches:');
	matches3.forEach((match, i) => {
		const emoji = i === matches3.length - 1 ? '❌' : '✅';
		console.log(
			`${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
				3
			)})`
		);
	});
	console.log('');

	// Example 4: Social media evolution
	console.log('📱 SOCIAL MEDIA EXAMPLE: Platform Evolution');
	console.log('Formula: Twitter - sanity + chaos ≈ ?');

	const [twitterVec, sanityVec, chaosVec] = await Promise.all([
		getEmbedding('Twitter'),
		getEmbedding('sanity'),
		getEmbedding('chaos'),
	]);

	const result4 = addVectors(
		subtractVectors(twitterVec, sanityVec),
		chaosVec
	);
	const candidates4 = [
		'X',
		'4chan',
		'Reddit',
		'TikTok',
		'hellscape',
		'dumpsterfire',
		'library', // obviously wrong - should have low similarity
	];
	const matches4 = await findClosestWord(result4, candidates4);

	console.log('Top matches:');
	matches4.forEach((match, i) => {
		const emoji = i === matches4.length - 1 ? '❌' : '✅';
		console.log(
			`${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
				3
			)})`
		);
	});
	console.log('');

	// Example 5: Career progression
	console.log('💼 CAREER EXAMPLE: Professional Evolution');
	console.log('Formula: intern - enthusiasm + cynicism ≈ ?');

	const [internVec, enthusiasmVec, cynicismVec] = await Promise.all([
		getEmbedding('intern'),
		getEmbedding('enthusiasm'),
		getEmbedding('cynicism'),
	]);

	const result5 = addVectors(
		subtractVectors(internVec, enthusiasmVec),
		cynicismVec
	);
	const candidates5 = [
		'manager',
		'executive',
		'burnout',
		'veteran',
		'survivor',
		'director',
		'sunshine', // obviously wrong - should have low similarity
	];
	const matches5 = await findClosestWord(result5, candidates5);

	console.log('Top matches:');
	matches5.forEach((match, i) => {
		const emoji = i === matches5.length - 1 ? '❌' : '✅';
		console.log(
			`${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
				3
			)})`
		);
	});
	console.log('');

	// Example 6: Dating app reality
	console.log('💕 DATING EXAMPLE: App Reality');
	console.log('Formula: dating - authenticity + filters ≈ ?');

	const [datingVec, authenticityVec, filtersVec] = await Promise.all([
		getEmbedding('dating'),
		getEmbedding('authenticity'),
		getEmbedding('filters'),
	]);

	const result6 = addVectors(
		subtractVectors(datingVec, authenticityVec),
		filtersVec
	);
	const candidates6 = [
		'catfish',
		'Instagram',
		'facade',
		'performance',
		'theater',
		'illusion',
		'broccoli', // obviously wrong - should have low similarity
	];
	const matches6 = await findClosestWord(result6, candidates6);

	console.log('Top matches:');
	matches6.forEach((match, i) => {
		const emoji = i === matches6.length - 1 ? '❌' : '✅';
		console.log(
			`${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
				3
			)})`
		);
	});
	console.log('');

	// Interactive section
	console.log('🎯 WHY THIS WORKS:');
	console.log('==================');
	console.log(
		'Vector embeddings capture semantic relationships in high-dimensional space.'
	);
	console.log(
		"When we do math on these vectors, we're manipulating meaning itself!"
	);
	console.log('');
	console.log('Think of it like this:');
	console.log('• Vectors encode the "essence" of concepts');
	console.log('• Addition combines concepts');
	console.log('• Subtraction removes aspects');
	console.log('• The result points to related concepts in semantic space');
	console.log('');
	console.log('🔬 EXERCISE FOR YOU:');
	console.log('Try creating your own word equations! Some ideas:');
	console.log('• coffee - sleep + anxiety ≈ ?');
	console.log('• Netflix - content + ads ≈ ?');
	console.log('• startup - funding + desperation ≈ ?');
	console.log('• influencer - talent + followers ≈ ?');

	//TODO: create your own examples and run them to gain some intuition on how vector math works
	//Using words from embeddings cache. Cause I don't want to randomly look for words in OpenAI database.
	//Exercises!
	console.log('\n');
	console.log('Exercise 1:');
	console.log('• coffee - sleep + anxiety ≈ ?');
	const [ coffeeVec, sleepVec, anxVec] = await Promise.all([
		getEmbedding('coffee'),
		getEmbedding('sleep'),
		getEmbedding('anxVec')
	]);

	const result7 = addVectors(
		subtractVectors(coffeeVec, sleepVec),
		anxVec
	);
	const matches7 =  await findClosestWord(result7, ['shakes', 'hospital', 'insomnia']);
	
	console.log('Top matches:');
	matches7.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
	 console.log('\n');
    console.log('Exercise 2:');
	console.log('• Netflix - content + ads ≈ ?');
	const [ netVec, contVec, adVec] = await Promise.all([
		getEmbedding('netflix'),
		getEmbedding('content'),
		getEmbedding('ads')
	]);

	const result8 = addVectors(
		subtractVectors(netVec, contVec),
		adVec
	);
	const matches8 =  await findClosestWord(result8, vocabulary);
	
	console.log('Top matches:');
	matches8.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
    console.log('\n');
	console.log('Exercise 3:');
	console.log('• startup - funding + desperation ≈ ?');
	const [ startVec, fundVec, desVec] = await Promise.all([
		getEmbedding('startup'),
		getEmbedding('funding'),
		getEmbedding('desperation')
	]);

	const result9 = addVectors(
		subtractVectors(startVec, fundVec),
		desVec
	);
	const matches9 =  await findClosestWord(result9, vocabulary);
	
	console.log('Top matches:');
	matches9.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
    console.log('\n');
    console.log('Exercise 4:');
	console.log('• influencer - talent + followers ≈ ?');
	const [ infVec, talVec, folVec] = await Promise.all([
		getEmbedding('influencer'),
		getEmbedding('talent'),
		getEmbedding('followers')
	]);

	const result10 = addVectors(
		subtractVectors(infVec, talVec),
		folVec
	);
	const matches10 =  await findClosestWord(result10, vocabulary);
	
	console.log('Top matches:');
	matches10.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
    console.log('\n');
	console.log('Exercise 5:');
	console.log('• Tokyo - Japan + Germany ≈ ?');
	const [ tokVec, japVec, gerVec] = await Promise.all([
		getEmbedding('Tokyo'),
		getEmbedding('Japan'),
		getEmbedding('Germany')
	]);

	const result11 = addVectors(
		subtractVectors(tokVec, japVec),
		gerVec
	);
	const matches11 =  await findClosestWord(result11, vocabulary);
	
	console.log('Top matches:');
	matches11.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
    console.log('\n');
    console.log('Exercise 6:');
	console.log('• biggest - big + small ≈ ?');
	const [ biggestVec, bigVec, smalVec] = await Promise.all([
		getEmbedding('biggest'),
		getEmbedding('big'),
		getEmbedding('small')
	]);

	const result12 = addVectors(
		subtractVectors(biggestVec, bigVec),
		smalVec
	);
	const matches12 =  await findClosestWord(result12, vocabulary);
	
	console.log('Top matches:');
	matches12.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
	console.log('\n');
    console.log('Exercise 6:');
	console.log('running - run + eat ≈ ?');
	const [ runningVec, runVec, eatVec] = await Promise.all([
		getEmbedding('running'),
		getEmbedding('run'),
		getEmbedding('eat')
	]);

	const result13 = addVectors(
		subtractVectors(runningVec, runVec),
		eatVec
	);
	const matches13 =  await findClosestWord(result13, vocabulary);
	
	console.log('Top matches:');
	matches13.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
    console.log('\n');
	console.log('Exercise 7:');
	console.log('iPhone - Apple + Microsoft ≈ ?');
	const [ iphoneVec, appVec, micVec] = await Promise.all([
		getEmbedding('iPhone'),
		getEmbedding('Apple'),
		getEmbedding('Microsoft')
	]);

	const result14 = addVectors(
		subtractVectors(iphoneVec, appVec),
		micVec
	);
	//tested: ['surface', 'tablet', 'laptop', 'samsung']
	const matches14 =  await findClosestWord(result14, vocabulary);
	
	console.log('Top matches:');
	matches14.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
	
	//console.log() Plurals: dog - dogs + cat ≈ ?
	console.log('\n');
	console.log('Exercise 8:');
	console.log('Plurals: dog - dogs + cat ≈ ?');
	const [ dogVec, dogsVec, catVec] = await Promise.all([
		getEmbedding('dog'),
		getEmbedding('dogs'),
		getEmbedding('cat')
	]);

	const result15 = addVectors(
		subtractVectors(dogVec, dogsVec),
		catVec
	);
	const matches15 =  await findClosestWord(result15, vocabulary);
	
	console.log('Top matches:');
	matches15.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
	//Professions: doctor - hospital + school ≈ ?
    console.log('\n');
	console.log('Exercise 9:');
	console.log('Professions: doctor - hospital + school ≈ ?');
	const [ docVec, hosVec, schVec] = await Promise.all([
		getEmbedding('doctor'),
		getEmbedding('hospital'),
		getEmbedding('school')
	]);

	const result16 = addVectors(
		subtractVectors(docVec, hosVec),
		schVec
	);
	const matches16 =  await findClosestWord(result16, vocabulary);
	
	console.log('Top matches:');
	matches16.slice(0, 3).forEach((match, i) => {
	   const emoji = i === 2 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	   );
     });
	 
	 //=========================================================================
	 // Assignment: 2 Formulated Equations
     console.log('\n');
	 console.log('Assignment: First Equation');
	 console.log('Movie Culture: spider - woman + comic ≈ ?');
	 const [ spiderVec, womVec, comVec] = await Promise.all([
		getEmbedding('spider'),
		getEmbedding('woman'),
		getEmbedding('marvel')
	 ]);
     const assign1 = addVectors(
		subtractVectors(spiderVec, womVec),
		comVec
	 );

	 const matches_ass1 =  await findClosestWord(assign1, vocabulary);
	 //been getting duplicates have to remove
	const matches_a1 = [...new Set(matches_ass1)];
	 console.log('Top matches:');
	   matches_a1.slice(0, 6).forEach((match, i) => {
	   const emoji = i === 5 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	    );
       });

   // Second Equation
     console.log('\n');
	 console.log('Assignment: Second Equation');
	 console.log('Tech Context: analyst + troubleshooting - bug ≈ ?');
	 const [ anaVec, troubVec, bugVec] = await Promise.all([
		getEmbedding('analyst'),
		getEmbedding('troubleshooting'),
		getEmbedding('bug')
	 ]);
     const assign2 = subtractVectors(addVectors(anaVec, troubVec), bugVec);

	 const matches_ass2 =  await findClosestWord(assign2, ['resolve', 'solution', 'case', 'debug', 'find', 'business']);
	 //const matches_ass2 =  await findClosestWord(assign2, vocabulary);
	 //been getting duplicates have to remove
	const matches_a2 = [...new Set(matches_ass2)];
	 console.log('Top matches:');
	   matches_a2.slice(0, 6).forEach((match, i) => {
	   const emoji = i === 5 ? '❌' : '✅';
	   console.log(
		  `${emoji} ${i + 1}. ${match.word} (similarity: ${match.similarity.toFixed(
			3
		 )})`
	    );
       });
}
//needed to generate my own embeddings cahce for the exercises

// Run the demonstration
demonstrateWordArithmetic().catch(console.error);

//Generated my own embeddings cache cause wasn't sure of the words to use for the math
//generateAndSaveEmbeddings().catch(console.error);
//generateEmbeddingsCache().catch(console.error);
