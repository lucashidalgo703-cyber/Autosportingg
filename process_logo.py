from PIL import Image

def process_logo(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        new_data = []
        
        # Diagnostics
        count_trans = 0
        count_red = 0
        count_white = 0
        
        for item in datas:
            r, g, b, a = item
            
            # 1. Detect White/Light Background -> Transparent
            # Lowered threshold slightly to catch light gray/compression artifacts
            if r > 200 and g > 200 and b > 200:
                new_data.append((255, 255, 255, 0))
                count_trans += 1
                
            # 2. Detect Red Swoosh -> Keep Red
            # Check for Red dominance
            elif r > 100 and r > (g + 20) and r > (b + 20):
                new_data.append((r, g, b, 255))
                count_red += 1
                
            # 3. Detect Everything Else (Presumably Blue text) -> Pure White
            else:
                new_data.append((255, 255, 255, 255))
                count_white += 1

        img.putdata(new_data)
        img.save(output_path, "PNG")
        
        print(f"DONE. Stats: Transparent={count_trans}, Red={count_red}, KeyWhite={count_white}")
        
        if count_red < 100:
            print("WARNING: Very few red pixels detected! Check thresholds.")
        else:
            print("Verified: Red swoosh detected.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # NEWEST file from user
    input_file = "C:/Users/USER/.gemini/antigravity/brain/29f07675-4bd2-4fd5-b270-449975b7c398/uploaded_media_1770220509087.png"
    output_file = "c:/Users/USER/.gemini/antigravity/scratch/Autosportingg/public/logo-header-v3.png"
    process_logo(input_file, output_file)
