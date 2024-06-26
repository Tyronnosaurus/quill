import { type ClassValue, clsx } from "clsx"
import { Metadata } from "next"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Generate absolute url from relative path */
export function absoluteUrl(path: string) {
  // When called from a browser, return url as is
  if (typeof window !== 'undefined') return(path)
  
  // When executed server-side (e.g., in a Node.js environment),
  // if the website has been deployed and is on Vercel, construct url accordingly.
  // Vercel automatically creates the VERCEL_URL system environmental variable (e.g. *.vercel.app)
  if (process.env.VERCEL_URL)
    return(`https://${process.env.VERCEL_URL}${path}`)
  
  // Otherwise, assume a local deployment of the server
  return (`http://localhost:${process.env.PORT ?? 3000}${path}`)
}


export function constructMetadata(
  {
    title = "Quill - voice of the documents",
    description = "Quill is an open-source software to make chatting to your PDF files easy.",
    image = "/thumbnail.png",
    icons = "/favicon.ico",
    noIndex = false
  } : {
    title?: string,
    description?: string,
    image?: string,
    icons?: string,
    noIndex?: boolean
  } = {}): Metadata {

    return({
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {url:image}
        ]
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
        creator: ""
      },
      icons,
      metadataBase: new URL("https://quill-beta-nine.vercel.app/"),
      themeColor: "#FFF",
      ...(noIndex && {
        robots: {
          index: false,
          follow: false
        }
      })
    })

  }