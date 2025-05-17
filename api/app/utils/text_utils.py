def split_text_with_overlap(text: str, chunk_size: int = 500, overlap: int = 100) -> list:
    """
    Splits text into chunks with overlap for better context preservation.
    """
    tokens = text.split()
    chunks = []

    for i in range(0, len(tokens), chunk_size - overlap):
        chunk = tokens[i:i + chunk_size]
        chunks.append(" ".join(chunk))

        if i + chunk_size >= len(tokens):
            break

    return chunks