from PIL import Image
import numpy as np

def process_logo(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    # Unpack channels
    r, g, b, a = data.T
    
    # Identify White Background (or near white)
    # Threshold: R,G,B > 220
    white_areas = (r > 200) & (g > 200) & (b > 200)
    
    # Identify Red Swoosh
    # Red is dominant: R > 150 and R > G + 50 and R > B + 50
    # The red in the provided image is quite distinct
    red_areas = (r > 100) & (r > g * 1.5) & (r > b * 1.5)
    
    # Identify Blue/Dark Text
    # Not white, Not red, Not transparent
    # Text is dark navy/blackish
    # We can just say: If NOT white_areas AND NOT red_areas -> make WHITE
    text_areas = ~white_areas & ~red_areas
    
    # --- Apply Changes ---
    
    # 1. Make White Background Transparent
    data[..., 3] = np.where(white_areas, 0, 255) # Alpha 0 for white bg
    
    # 2. Make Text White (Keep Alpha 255)
    # Set R,G,B to 255 where text_areas is True
    data[..., 0] = np.where(text_areas, 255, data[..., 0])
    data[..., 1] = np.where(text_areas, 255, data[..., 1])
    data[..., 2] = np.where(text_areas, 255, data[..., 2])
    
    # 3. Red areas are left alone (except alpha is ensured 255 by default logic above if not white)
    
    # Create new image
    new_img = Image.fromarray(data)
    new_img.save(output_path)
    print(f"Processed image saved to {output_path}")

if __name__ == "__main__":
    # Use the specific uploaded file path
    input_file = "C:/Users/USER/.gemini/antigravity/brain/29f07675-4bd2-4fd5-b270-449975b7c398/uploaded_media_1770219310164.png"
    output_file = "c:/Users/USER/.gemini/antigravity/scratch/Autosportingg/public/logo-header-white-red.png"
    process_logo(input_file, output_file)
