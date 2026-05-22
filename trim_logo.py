from PIL import Image

def trim_logo(input_path, output_path):
    print(f"Trimming {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        
        # GetBoundingBox returns the box (left, upper, right, lower) 
        # surrounding the non-zero (non-transparent) regions
        bbox = img.getbbox()
        
        if bbox:
            print(f"Original Size: {img.size}")
            print(f"Bounding Box: {bbox}")
            
            trimmed_img = img.crop(bbox)
            print(f"New Size: {trimmed_img.size}")
            
            trimmed_img.save(output_path, "PNG")
            print(f"Saved trimmed image to {output_path}")
        else:
            print("Error: Image appears to be completely transparent/empty!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Use v5 as source since it has the correct colors
    input_file = "c:/Users/USER/.gemini/antigravity/scratch/Autosportingg/public/logo-header-v5.png"
    output_file = "c:/Users/USER/.gemini/antigravity/scratch/Autosportingg/public/logo-header-v6-trimmed.png"
    trim_logo(input_file, output_file)
