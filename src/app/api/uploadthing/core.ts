import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
 
import { PDFLoader } from "langchain/document_loaders/fs/pdf"
import { getPineconeClient } from "@/lib/pinecone"
import { PineconeStore } from "langchain/vectorstores/pinecone"
import { OpenAIEmbeddings } from "langchain/embeddings/openai"

const f = createUploadthing();
 
// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {

  // Define as many FileRoutes as you like, each with a unique routeSlug
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute

    .middleware(async ({ req }) => {
      // This code runs on your server before upload

      const { getUser } = getKindeServerSession()
      const user = getUser()

      // If no user is logged in, throw error and stop uploading to uploadThing
      if(!user || !user.id) throw new Error("Unauthorized")
       
      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return({userId: user.id})
    })

    .onUploadComplete(async ({ metadata, file }) => {

      // Once we finish uploading, add a File entry to our database
      //(with a PROCESSING status since we still have to parse it)
      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          url: file.url, //`https://utfs.io/f/${file.key}`, // //`https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`,
          uploadStatus: "PROCESSING"
        }
      })

      // Try to postprocess the file with Pinecone
      try {
        // Fetch the file
        const response = await fetch(file.url)
        const blob = await response.blob()

        const loader = new PDFLoader(blob)

        const pageLevelDocs = await loader.load()

        const pagesAmt = pageLevelDocs.length

        // Vectorize and index the entire document
        const pinecone = await getPineconeClient()
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!)

        const embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPEN_AI_KEY
        })

        await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
          pineconeIndex,
          namespace: createdFile.id
        })

        // Change the file's uploadStatus in the db from Processing to Success
        await db.file.update({
          data: { uploadStatus: "SUCCESS" },
          where: { id: createdFile.id }
        })

      } catch (err) {
        console.log(err)

        // Change the file's uploadStatus in the db from Processing to Failed
        await db.file.update({
          data: { uploadStatus: "FAILED" },
          where: { id: createdFile.id }
        })
      }

    })
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;