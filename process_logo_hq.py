from PIL import Image

def process_logo_hq(input_path, output_path):
    print(f"Processing HQ {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        new_data = []
        
        for item in datas:
            r, g, b, a = item
            
            # Respect existing transparency
            if a < 20: 
                new_data.append((255, 255, 255, 0))
                continue
                
            # Detect Red Swoosh (Critical to keep)
            # Using broader definition to catch anti-aliased red edges
            if r > 100 and r > g + 20 and r > b + 20:
                new_data.append((r, g, b, a)) # Keep original RGBA
                
            # Detect Blue/Dark Text (Everything else that is visible)
            else:
                # Make it white, but KEEP the original Alpha for smooth edges (Anti-aliasing)
                new_data.append((255, 255, 255, a))

        img.putdata(new_data)
        
        # Trim whitespace for maximum detail usage
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
        
        img.save(output_path, "PNG", quality=100)
        print(f"Saved HQ trimmed image to {output_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Using the best source file we have
    input_file = "C:/Users/USER/.gemini/antigravity/brain/29f07675-4bd2-4fd5-b270-449975b7c398/uploaded_media_1770220509087.png"
    output_file = "c:/Users/USER/.gemini/antigravity/scratch/Autosportingg/public/logo-header-v7-hq.png"
    process_logo_hq(input_file, output_file)
